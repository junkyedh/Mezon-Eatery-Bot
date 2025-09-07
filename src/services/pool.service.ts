import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pool } from '@app/entities/pool.entity';

@Injectable()
export class PoolService {
  constructor(
    @InjectRepository(Pool)
    private poolRepository: Repository<Pool>,
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
