import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan, LoanStatus, LoanTermUnit } from '@app/entities/loan.entity';
import { UserService } from './user.service';
import { PoolService } from './pool.service';
import { TransactionService } from './transaction.service';
import { MezonWalletService } from './mezon-wallet.service';

@Injectable()
export class LoanService {
  constructor(
    @InjectRepository(Loan)
    private loanRepository: Repository<Loan>,
    private userService: UserService,
    private poolService: PoolService,
    private transactionService: TransactionService,
    private wallet: MezonWalletService,
  ) {}

  /**
   * New P2P: Borrower creates a loan request (pending)
   */
  async createLoanRequest(params: {
    mezonUserId: string;
    amount: number;
    interestRate: number; // annual %
    termUnit: LoanTermUnit;
    termQuantity: number; // number of units
    fee?: number; // flat fee deducted from disbursement
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
    // Check internal balance
    if (lender.balance < loan.amount)
      throw new Error('Số dư nội bộ không đủ để cho vay');

    // Check actual balance on Mezon wallet (if SDK returns -1 then ignore)
    const chainBalance = await this.wallet.getUserBalance(lender.mezonUserId);
    if (chainBalance !== -1 && chainBalance < loan.amount) {
      throw new Error('Số dư ví Mezon không đủ để cho vay');
    }

    loan.lenderUserId = lender.id;
    loan.status = LoanStatus.ACTIVE;
    loan.startDate = new Date();
    loan.approvedAt = new Date();
    // Perform token transfers: lender -> bot, then bot -> borrower (minus fee)
    // Idempotency key simple: loanId + timestamp phases
    const idemBase = `fund:${loan.id}`;
    const toBot = await this.wallet.transferUserToBot({
      fromUserId: lender.mezonUserId,
      amount: loan.amount,
      idemKey: idemBase + ':lend',
    });
    if (!toBot.success) {
      throw new Error('Chuyển token từ lender vào bot thất bại');
    }

    const disburseAmount = loan.amount - loan.fee;
    if (disburseAmount < 0) throw new Error('Phí lớn hơn số tiền');
    if (disburseAmount > 0) {
      const borrowerEntity = await this.userService.getUserById(loan.userId);
      if (!borrowerEntity?.mezonUserId)
        throw new Error('Không lấy được mezonUserId borrower');
      const toBorrower = await this.wallet.transferBotToUser({
        toUserId: borrowerEntity.mezonUserId,
        amount: disburseAmount,
        idemKey: idemBase + ':borrower',
      });
      if (!toBorrower.success) {
        throw new Error('Giải ngân token cho borrower thất bại');
      }
    }

    // Update internal balances to reflect changes (keep fee in bot)
    await this.userService.updateBalance(lender.id, -loan.amount);
    await this.userService.updateBalance(loan.userId, disburseAmount);
    return this.loanRepository.save(loan);
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

    const { interestAccrued, early } = this.calculateAccruedInterest(loan);
    const totalDue = +(loan.amount + interestAccrued).toFixed(2);
    if (borrower.balance < totalDue)
      throw new Error('Số dư nội bộ không đủ để trả nợ');

    // Check actual balance on Mezon wallet (if SDK returns -1 then ignore)
    const chainBalance = await this.wallet.getUserBalance(borrower.mezonUserId);
    if (chainBalance !== -1 && chainBalance < totalDue) {
      throw new Error('Số dư ví Mezon không đủ để trả nợ');
    }

    // Borrower -> bot -> lender settlement
    const idemBase = `repay:${loan.id}`;
    const toBot = await this.wallet.transferUserToBot({
      fromUserId: borrower.mezonUserId,
      amount: totalDue,
      idemKey: idemBase + ':borrower',
    });
    if (!toBot.success) throw new Error('Chuyển token trả nợ vào bot thất bại');
    const toLender = await this.wallet.transferBotToUser({
      toUserId: lender.mezonUserId,
      amount: totalDue,
      idemKey: idemBase + ':lender',
    });
    if (!toLender.success)
      throw new Error('Chuyển token trả nợ cho lender thất bại');

    await this.userService.updateBalance(borrower.id, -totalDue);
    await this.userService.updateBalance(lender.id, totalDue);

    loan.paidAmount = totalDue;
    loan.status = LoanStatus.COMPLETED;
    loan.repaidAt = new Date();
    await this.loanRepository.save(loan);

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
    const elapsedMs = now.getTime() - start.getTime();
    const elapsedDays = Math.max(Math.floor(elapsedMs / 86400000), 0);
    const totalTermDays = Math.max(
      Math.floor((loan.dueDate.getTime() - start.getTime()) / 86400000),
      1,
    );
    const annualRate = loan.interestRate / 100;
    const interestFull = loan.amount * annualRate * (totalTermDays / 365);
    const proportion = Math.min(elapsedDays / totalTermDays, 1);
    const interestAccrued = +(interestFull * proportion).toFixed(2);
    return {
      interestAccrued,
      early: proportion < 1,
      elapsedDays,
      totalTermDays,
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

    // Update loan paid amount
    await this.loanRepository.update(activeLoan.id, {
      paidAmount: activeLoan.paidAmount + amount,
    });

    // Update user balance
    await this.userService.updateBalance(user.id, -amount);

    // Update pool
    await this.poolService.removeLoanFromPool(amount);

    // Check if loan is fully paid
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

      // Block user after 2 missed payments
      if (loan.missedPayments >= 2) {
        await this.userService.blockUser(loan.userId);
        await this.loanRepository.update(loan.id, {
          status: LoanStatus.DEFAULTED,
        });
      }
    }
  }
}
