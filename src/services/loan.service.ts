import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan, LoanStatus, LoanTermUnit } from '@app/entities/loan.entity';
import { UserService } from './user.service';
import { PoolService } from './pool.service';
import { MezonWalletService } from './mezon-wallet.service';

@Injectable()
export class LoanService {
  constructor(
    @InjectRepository(Loan)
    private loanRepository: Repository<Loan>,
    private userService: UserService,
    @Inject(forwardRef(() => PoolService))
    private poolService: PoolService,
    private wallet: MezonWalletService,
  ) {}

  async createLoanRequest(params: {
    mezonUserId: string;
    amount: number;
    interestRate: number;
    termUnit: LoanTermUnit;
    termQuantity: number;
    fee?: number;
  }): Promise<Loan> {
    const { mezonUserId, amount, interestRate, termUnit, termQuantity, fee } =
      params;
    const user = await this.userService.getUserByMezonId(mezonUserId);
    if (!user) throw new Error('User not found');
    if (user.isBlocked) throw new Error('User bị khóa');
    if (amount < 1000) throw new Error('Số tiền vay tối thiểu 1,000');
    if (termQuantity <= 0 || termQuantity > 24)
      throw new Error('Kỳ hạn không hợp lệ (1-24)');
    if (!['week', 'month'].includes(termUnit))
      throw new Error('Đơn vị kỳ hạn không hợp lệ');
    if (interestRate <= 0 || interestRate > 200)
      throw new Error('Lãi suất phải nằm trong 0-200');

    const dueDate = this.calculateDueDate(
      new Date(),
      termUnit as LoanTermUnit,
      termQuantity,
    );

    const loan = this.loanRepository.create({
      userId: user.id,
      amount,
      interestRate,
      termUnit,
      termQuantity,
      fee: fee || 0,
      status: LoanStatus.PENDING,
      dueDate,
      description: `Yêu cầu vay ${amount} tokens (${termQuantity} ${termUnit})`,
      termDays: termUnit === 'week' ? termQuantity * 7 : termQuantity * 30,
      interestAmount: +(
        amount *
        (interestRate / 100) *
        ((termUnit === 'week' ? termQuantity * 7 : termQuantity * 30) / 365)
      ).toFixed(2),
      totalRepayAmount: 0,
    });
    loan.totalRepayAmount = +(loan.amount + loan.interestAmount).toFixed(2);
    return this.loanRepository.save(loan);
  }

  async listPendingRequests(): Promise<Loan[]> {
    return this.loanRepository.find({
      where: { status: LoanStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
  }

  async fundLoan(params: {
    loanId: string;
    lenderMezonUserId: string;
  }): Promise<Loan> {
    const { loanId, lenderMezonUserId } = params;
    const loan = await this.loanRepository.findOne({ where: { id: loanId } });
    if (!loan) throw new Error('Loan không tồn tại');
    if (loan.status !== LoanStatus.PENDING)
      throw new Error('Khoản vay không ở trạng thái chờ');

    const lender = await this.userService.getUserByMezonId(lenderMezonUserId);
    if (!lender) throw new Error('Người cho vay không tồn tại');
    if (lender.isBlocked) throw new Error('Lender bị khóa');

    if (lender.id === loan.userId)
      throw new Error('Không thể tự cho chính mình vay');
    if (lender.balance < loan.amount)
      throw new Error('Số dư nội bộ không đủ để cho vay');

    const chainBalance = await this.wallet.getUserBalance(lender.mezonUserId);
    if (chainBalance !== -1 && chainBalance < loan.amount) {
      throw new Error('Số dư ví Mezon không đủ để cho vay');
    }

    loan.lenderUserId = lender.id;
    await this.loanRepository.save(loan);

    const disburseAmount = loan.amount - loan.fee;
    if (disburseAmount < 0) throw new Error('Phí lớn hơn số tiền');
    if (disburseAmount > 0) {
      const borrowerEntity = await this.userService.getUserById(loan.userId);
      if (!borrowerEntity?.mezonUserId)
        throw new Error('Không lấy được mezonUserId borrower');

      const idemBase = `fund:${loan.id}`;
      const toBorrower = await this.wallet.transferBotToUser({
        toUserId: borrowerEntity.mezonUserId,
        amount: disburseAmount,
        idemKey: idemBase + ':borrower',
      });
      if (!toBorrower.success) {
        throw new Error('Giải ngân token cho borrower thất bại');
      }
    }

    await this.userService.updateBalance(lender.id, -loan.amount);

    loan.status = LoanStatus.ACTIVE;
    loan.startDate = new Date();
    loan.approvedAt = new Date();

    const savedLoan = await this.loanRepository.save(loan);

    await this.poolService.recalculatePool();

    return savedLoan;
  }

  async repayLoan(params: { loanId: string; mezonUserId: string }): Promise<{
    totalDue: number;
    interestPortion: number;
    principalPortion: number;
    fee: number;
    early: boolean;
    loan: Loan;
  }> {
    const { loanId, mezonUserId } = params;
    const loan = await this.loanRepository.findOne({ where: { id: loanId } });
    if (!loan) throw new Error('Loan không tồn tại');
    if (loan.status !== LoanStatus.ACTIVE)
      throw new Error('Khoản vay chưa hoạt động hoặc đã đóng');
    const borrower = await this.userService.getUserByMezonId(mezonUserId);
    if (!borrower || borrower.id !== loan.userId)
      throw new Error('Bạn không phải người vay');
    if (!loan.lenderUserId) throw new Error('Thiếu thông tin người cho vay');
    const lender = await this.userService.getUserById(loan.lenderUserId);
    if (!lender) throw new Error('Lender không tồn tại');

    const { totalDue, interestAccrued, early } =
      this.calculateRealTimeRepayAmount(loan);

    if (borrower.balance < totalDue) {
      throw new Error(
        `Số dư nội bộ không đủ để trả nợ. Cần: ${totalDue}, Có: ${borrower.balance}. Vui lòng nạp thêm token vào bot trước.`,
      );
    }

    const idemBase = `repay:${loan.id}`;
    const toLender = await this.wallet.transferBotToUser({
      toUserId: lender.mezonUserId,
      amount: totalDue,
      idemKey: idemBase + ':lender',
    });

    if (!toLender.success) {
      throw new Error(
        'Chuyển token trả nợ cho lender thất bại. Token vẫn trong bot, bạn có thể thử lại sau.',
      );
    }

    if (!toLender.success) {
      throw new Error(
        'Chuyển token trả nợ cho lender thất bại. Token vẫn trong bot, bạn có thể thử lại sau.',
      );
    }

    await this.userService.updateBalance(borrower.id, -totalDue);

    loan.paidAmount = totalDue;
    loan.status = LoanStatus.COMPLETED;
    loan.repaidAt = new Date();
    await this.loanRepository.save(loan);

    await this.poolService.recalculatePool();

    return {
      totalDue,
      interestPortion: interestAccrued,
      principalPortion: loan.amount,
      fee: loan.fee,
      early,
      loan,
    };
  }

  calculateDueDate(start: Date, unit: LoanTermUnit, quantity: number): Date {
    const d = new Date(start);
    if (unit === 'week') d.setDate(d.getDate() + quantity * 7);
    else if (unit === 'month') d.setMonth(d.getMonth() + quantity);
    return d;
  }

  calculateAccruedInterest(loan: Loan): {
    interestAccrued: number;
    early: boolean;
    elapsedDays: number;
    totalTermDays: number;
  } {
    const start = loan.startDate || loan.createdAt;
    const now = new Date();

    const dueDate =
      loan.dueDate instanceof Date ? loan.dueDate : new Date(loan.dueDate);
    const startDate = start instanceof Date ? start : new Date(start);

    const elapsedMs = now.getTime() - startDate.getTime();
    const elapsedDays = Math.max(Math.floor(elapsedMs / 86400000), 0);
    const totalTermDays = Math.max(
      Math.floor((dueDate.getTime() - startDate.getTime()) / 86400000),
      1,
    );
    const annualRate = Number(loan.interestRate) / 100;
    const loanAmount = Number(loan.amount);
    const interestFull = loanAmount * annualRate * (totalTermDays / 365);
    const proportion = Math.min(elapsedDays / totalTermDays, 1);
    const interestAccrued = Number((interestFull * proportion).toFixed(2));
    return {
      interestAccrued,
      early: proportion < 1,
      elapsedDays,
      totalTermDays,
    };
  }

  calculateRealTimeRepayAmount(loan: Loan): {
    totalDue: number;
    interestAccrued: number;
    early: boolean;
  } {
    if (loan.status === 'completed') {
      const loanAmount = Number(loan.amount);
      const paidAmount = Number(loan.paidAmount || 0);
      const totalRepayAmount = Number(loan.totalRepayAmount);
      const actualInterestPaid = paidAmount - loanAmount;
      return {
        totalDue: paidAmount || totalRepayAmount,
        interestAccrued: Math.max(0, actualInterestPaid),
        early: false,
      };
    }

    if (loan.status === 'active') {
      const { interestAccrued, early } = this.calculateAccruedInterest(loan);
      const loanAmount = Number(loan.amount);
      const totalRepayAmount = Number(loan.totalRepayAmount);
      const totalDue = early
        ? Number((loanAmount + interestAccrued).toFixed(2))
        : Number(totalRepayAmount.toFixed(2));
      return { totalDue, interestAccrued, early };
    }

    return {
      totalDue: Number(loan.totalRepayAmount),
      interestAccrued: Number(loan.interestAmount || 0),
      early: false,
    };
  }

  async getLoanById(id: string): Promise<Loan | null> {
    return this.loanRepository.findOne({ where: { id } });
  }

  async payLoan(mezonUserId: string, amount: number): Promise<void> {
    const user = await this.userService.getUserByMezonId(mezonUserId);
    if (!user) {
      throw new Error('User not found');
    }

    const activeLoan = await this.loanRepository.findOne({
      where: {
        userId: user.id,
        status: LoanStatus.ACTIVE,
      },
    });

    if (!activeLoan) {
      throw new Error('No active loan found');
    }

    if (user.balance < amount) {
      throw new Error('Insufficient balance for payment');
    }

    await this.loanRepository.update(activeLoan.id, {
      paidAmount: activeLoan.paidAmount + amount,
    });

    await this.userService.updateBalance(user.id, -amount);

    await this.poolService.removeLoanFromPool(amount);

    const updatedLoan = await this.loanRepository.findOne({
      where: { id: activeLoan.id },
    });

    if (updatedLoan && updatedLoan.paidAmount >= updatedLoan.amount) {
      await this.loanRepository.update(activeLoan.id, {
        status: LoanStatus.COMPLETED,
      });
    }
  }

  async getActiveLoan(mezonUserId: string): Promise<Loan | null> {
    const user = await this.userService.getUserByMezonId(mezonUserId);
    if (!user) {
      return null;
    }

    return this.loanRepository.findOne({
      where: {
        userId: user.id,
        status: LoanStatus.ACTIVE,
      },
    });
  }

  async checkMissedPayments(): Promise<void> {
    const overdueLoans = await this.loanRepository.find({
      where: {
        status: LoanStatus.ACTIVE,
        dueDate: new Date(),
      },
    });

    for (const loan of overdueLoans) {
      await this.loanRepository.update(loan.id, {
        missedPayments: loan.missedPayments + 1,
      });

      if (loan.missedPayments >= 2) {
        await this.userService.blockUser(loan.userId);
        await this.loanRepository.update(loan.id, {
          status: LoanStatus.DEFAULTED,
        });
      } else {
        await this.loanRepository.update(loan.id, {
          status: LoanStatus.DEFAULTED,
        });
      }
    }
  }

  async getActiveLoansAmount(): Promise<number> {
    const result = await this.loanRepository
      .createQueryBuilder('loan')
      .select('SUM(loan.amount)', 'total')
      .where('loan.status = :status', { status: 'active' })
      .getRawOne();

    return Math.max(0, Number(result?.total || 0));
  }

  async getTotalFeesFromActiveAndCompletedLoans(): Promise<number> {
    const result = await this.loanRepository
      .createQueryBuilder('loan')
      .select('SUM(loan.fee)', 'total')
      .where('loan.status IN (:...statuses)', {
        statuses: ['active', 'completed'],
      })
      .getRawOne();

    return Math.max(0, Number(result?.total || 0));
  }

  async getAllLoans(): Promise<Loan[]> {
    return this.loanRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async resetLoanToActive(loanId: string): Promise<void> {
    await this.loanRepository.update(loanId, {
      status: LoanStatus.ACTIVE,
    });
  }
}
