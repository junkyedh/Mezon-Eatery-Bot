import { Injectable } from '@nestjs/common';
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
    const totalUserBalances = users.reduce((sum, user) => sum + user.balance, 0);

    const activeLoans = await this.loanService.getActiveLoansAmount();
    
    const pool = await this.getPool();
    
    // Update pool with correct values
    // available = sum of user balances (internal tracking)
    // loaned = sum of active loans
    // total = available + loaned + fees (fees tracked as difference)
    await this.poolRepository.update(pool.id, {
      availableBalance: totalUserBalances,
      loanedAmount: activeLoans,
      // totalBalance remains same (tracks total tokens in bot)
    });
  }

  async addToPool(amount: number): Promise<void> {
    const pool = await this.getPool();

    await this.poolRepository.update(pool.id, {
      totalBalance: pool.totalBalance + amount,
      availableBalance: pool.availableBalance + amount,
    });
  }

  async removeFromPool(amount: number): Promise<void> {
    const pool = await this.getPool();

    if (pool.availableBalance < amount) {
      throw new Error('Insufficient pool balance');
    }

    await this.poolRepository.update(pool.id, {
      totalBalance: pool.totalBalance - amount,
      availableBalance: pool.availableBalance - amount,
    });
  }

  async withdrawFee(amount: number): Promise<void> {
    const pool = await this.getPool();
    
    // Reduce total balance when fee is withdrawn
    await this.poolRepository.update(pool.id, {
      totalBalance: pool.totalBalance - amount,
    });
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
}
