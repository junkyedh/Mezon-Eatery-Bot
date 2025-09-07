import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from '@app/entities/transaction.entity';
import { UserService } from './user.service';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private userService: UserService,
  ) {}

  async deposit(
    userId: string, // internal user.id
    amount: number,
    externalTxId?: string,
    idempotencyKey?: string,
    source: 'mezon' | 'manual' = 'manual',
  ): Promise<Transaction> {
    // Validate minimum amount
    if (amount < 1000) {
      throw new Error('Minimum deposit amount is 1,000 tokens');
    }

    return await this.transactionRepository.manager.transaction(
      async (entityManager) => {
        const transaction = entityManager.create(Transaction, {
          userId,
          type: TransactionType.DEPOSIT,
          amount,
          status: TransactionStatus.COMPLETED,
          description: `Deposit ${amount} tokens`,
          externalTxId,
          idempotencyKey,
          source,
        });

        await entityManager.save(transaction);
        await this.userService.updateBalance(userId, amount);
        return transaction;
      },
    );
  }

  async withdraw(
    userId: string, // internal user.id
    amount: number,
    externalTxId?: string,
    idempotencyKey?: string,
    source: 'mezon' | 'manual' = 'manual',
  ): Promise<Transaction> {
    // Validate minimum amount (mirrors SDK guard)
    if (amount < 1000) {
      throw new Error('Minimum withdrawal amount is 1,000 tokens');
    }

    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.balance < amount) {
      throw new Error('Insufficient balance');
    }

    return await this.transactionRepository.manager.transaction(
      async (entityManager) => {
        const transaction = entityManager.create(Transaction, {
          userId,
          type: TransactionType.WITHDRAW,
          amount,
          status: TransactionStatus.COMPLETED,
          description: `Withdraw ${amount} tokens`,
          externalTxId,
          idempotencyKey,
          source,
        });

        await entityManager.save(transaction);
        await this.userService.updateBalance(userId, -amount);
        return transaction;
      },
    );
  }

  async getTransactionHistory(userId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 10,
    });
  }

  async findByIdempotencyKey(idemKey: string): Promise<Transaction | null> {
    return this.transactionRepository.findOne({
      where: { idempotencyKey: idemKey },
    });
  }

  async findByExternalTxId(externalTxId: string): Promise<Transaction | null> {
    return this.transactionRepository.findOne({
      where: { externalTxId },
    });
  }

  async recordDeposit({
    userId,
    amount,
    externalTxId,
    idempotencyKey,
    source = 'mezon',
  }: {
    userId: string;
    amount: number;
    externalTxId?: string;
    idempotencyKey?: string;
    source?: 'mezon' | 'manual';
  }): Promise<Transaction> {
    return this.deposit(userId, amount, externalTxId, idempotencyKey, source);
  }
}
