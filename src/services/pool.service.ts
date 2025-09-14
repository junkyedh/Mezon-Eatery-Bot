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
    const users = await this.userService.getUsersWithPositiveBalance();
    const totalUserBalances = users.reduce(
      (sum, user) => sum + user.balance,
      0,
    );

    const activeLoansAmount = await this.loanService.getActiveLoansAmount();
    const totalFeesFromLoans =
      await this.loanService.getTotalFeesFromActiveAndCompletedLoans();

    const pool = await this.getPool();

    await this.poolRepository.update(pool.id, {
      availableBalance: totalUserBalances,
      loanedAmount: activeLoansAmount,
      totalBalance: totalUserBalances + totalFeesFromLoans,
    });
  }

  async addToPool(amount: number): Promise<void> {
    const pool = await this.getPool();

    await this.poolRepository.update(pool.id, {
      availableBalance: pool.availableBalance + amount,
    });

    await this.recalculatePool();
  }

  async removeFromPool(amount: number): Promise<void> {
    const pool = await this.getPool();

    if (pool.availableBalance < amount) {
      throw new Error('Insufficient pool balance');
    }

    await this.poolRepository.update(pool.id, {
      availableBalance: pool.availableBalance - amount,
    });

    await this.recalculatePool();
  }

  async withdrawFee(amount: number): Promise<void> {
    await this.recalculatePool();

    const totalFeesFromLoans =
      await this.loanService.getTotalFeesFromActiveAndCompletedLoans();

    if (totalFeesFromLoans < amount) {
      throw new Error('Insufficient fee balance to withdraw');
    }

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
