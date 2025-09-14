import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pool } from '@app/entities/pool.entity';
import { UserService } from './user.service';
import { LoanService } from './loan.service';

@Injectable()
export class PoolService {
  constructor(
    @InjectRepository(Pool)
    private poolRepository: Repository<Pool>,
    private userService: UserService,
    @Inject(forwardRef(() => LoanService))
    private loanService: LoanService,
  ) {}

  async getPool(): Promise<Pool> {
    let pool = await this.poolRepository.findOne({
      where: {},
    });

    if (!pool) {
      pool = this.poolRepository.create({
        totalBalance: 0,
        availableBalance: 0,
        loanedAmount: 0,
      });
      await this.poolRepository.save(pool);
    }

    return pool;
  }

  async getPoolBalance(): Promise<{
    total: number;
    available: number;
    loaned: number;
  }> {
    const pool = await this.getPool();
    return {
      total: pool.totalBalance,
      available: pool.availableBalance,
      loaned: pool.loanedAmount,
    };
  }

  async recalculatePool(): Promise<void> {
    // Get actual balances
    const users = await this.userService.getUsersWithPositiveBalance();
    const totalUserBalances = users.reduce(
      (sum, user) => sum + user.balance,
      0,
    );

    const activeLoansAmount = await this.loanService.getActiveLoansAmount();
    const totalFeesFromLoans =
      await this.loanService.getTotalFeesFromActiveAndCompletedLoans();

    const pool = await this.getPool();

    // Update pool with correct values
    // available = sum of user balances (internal tracking)
    // loaned = sum of active loans (for tracking only, not in totalBalance)
    // totalBalance = available + fees (loaned tokens are already with users)
    await this.poolRepository.update(pool.id, {
      availableBalance: totalUserBalances,
      loanedAmount: activeLoansAmount,
      totalBalance: totalUserBalances + totalFeesFromLoans,
    });
  }

  async addToPool(amount: number): Promise<void> {
    const pool = await this.getPool();

    // Only update availableBalance, totalBalance will be recalculated
    await this.poolRepository.update(pool.id, {
      availableBalance: pool.availableBalance + amount,
    });

    // Recalculate totalBalance = available + fees
    await this.recalculatePool();
  }

  async removeFromPool(amount: number): Promise<void> {
    const pool = await this.getPool();

    if (pool.availableBalance < amount) {
      throw new Error('Insufficient pool balance');
    }

    // Only update availableBalance, totalBalance will be recalculated
    await this.poolRepository.update(pool.id, {
      availableBalance: pool.availableBalance - amount,
    });

    // Recalculate totalBalance = available + fees
    await this.recalculatePool();
  }

  async withdrawFee(amount: number): Promise<void> {
    // Recalculate pool to ensure fees are up to date
    await this.recalculatePool();

    const totalFeesFromLoans =
      await this.loanService.getTotalFeesFromActiveAndCompletedLoans();

    if (totalFeesFromLoans < amount) {
      throw new Error('Insufficient fee balance to withdraw');
    }

    // Note: When admin withdraws fee, the fee amount is reduced from totalBalance
    // but the actual fee reduction happens when the loan is marked as fee-withdrawn
    // For now, we just recalculate pool after the withdrawal transaction
    await this.recalculatePool();
  }

  async addLoanToPool(amount: number): Promise<void> {
    const pool = await this.getPool();

    await this.poolRepository.update(pool.id, {
      loanedAmount: pool.loanedAmount + amount,
      availableBalance: pool.availableBalance - amount,
    });
  }

  async removeLoanFromPool(amount: number): Promise<void> {
    const pool = await this.getPool();

    await this.poolRepository.update(pool.id, {
      loanedAmount: pool.loanedAmount - amount,
      availableBalance: pool.availableBalance + amount,
    });
  }
}
