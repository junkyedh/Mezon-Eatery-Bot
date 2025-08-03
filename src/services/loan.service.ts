import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan, LoanStatus } from '@app/entities/loan.entity';
import { UserService } from './user.service';
import { PoolService } from './pool.service';
import { TransactionService } from './transaction.service';

@Injectable()
export class LoanService {
  constructor(
    @InjectRepository(Loan)
    private loanRepository: Repository<Loan>,
    private userService: UserService,
    private poolService: PoolService,
    private transactionService: TransactionService,
  ) {}

  async requestLoan(mezonUserId: string, amount: number, term: number): Promise<Loan> {
    const user = await this.userService.getUserByMezonId(mezonUserId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.isBlocked) {
      throw new Error('User is blocked from taking loans');
    }

    // Check if user has active loans
    const activeLoans = await this.loanRepository.find({
      where: {
        userId: user.id,
        status: LoanStatus.ACTIVE,
      },
    });

    if (activeLoans.length > 0) {
      throw new Error('User has active loans');
    }

    // Check loan amount vs NC Score (max 50% of NC Score)
    const maxLoanAmount = user.ncScore * 0.5;
    if (amount > maxLoanAmount) {
      throw new Error(`Maximum loan amount is ${maxLoanAmount} tokens (50% of NC Score)`);
    }

    // Check pool availability
    const poolBalance = await this.poolService.getPoolBalance();
    if (poolBalance.available < amount) {
      throw new Error('Insufficient pool balance for loan');
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + term);

    const loan = this.loanRepository.create({
      userId: user.id,
      amount,
      status: LoanStatus.APPROVED,
      dueDate,
      description: `Loan request for ${amount} tokens`,
    });

    await this.loanRepository.save(loan);

    // Add loan amount to pool
    await this.poolService.addLoanToPool(amount);

    // Update user balance
    await this.userService.updateBalance(user.id, amount);

    return loan;
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

      // Add positive points to NC Score for timely payment
      await this.userService.updateNCScore(user.id, 5000);
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

      // Deduct points from NC Score for missed payment
      await this.userService.updateNCScore(loan.userId, -10000);
    }
  }
} 