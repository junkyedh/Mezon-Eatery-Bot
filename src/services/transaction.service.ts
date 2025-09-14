import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from '@app/entities/transaction.entity';
import { UserService } from './user.service';
import { MezonWalletService } from './mezon-wallet.service';
import { PoolService } from './pool.service';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private userService: UserService,
    private wallet: MezonWalletService,
    private poolService: PoolService,
  ) {}

  async deposit(
    userId: string,
    amount: number,
    externalTxId?: string,
    idempotencyKey?: string,
    source: 'mezon' | 'manual' = 'manual',
  ): Promise<Transaction> {
    if (amount < 1000) {
      throw new Error('Minimum deposit amount is 1,000 tokens');
    }

    if (idempotencyKey) {
      const existingTx = await this.findByIdempotencyKey(idempotencyKey);
      if (existingTx) {
        return existingTx;
      }
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

        await this.poolService.addToPool(amount);

        return transaction;
      },
    );
  }

  async withdraw(
    userId: string,
    amount: number,
    externalTxId?: string,
    idempotencyKey?: string,
    source: 'mezon' | 'manual' = 'manual',
  ): Promise<Transaction> {
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

        await this.poolService.removeFromPool(amount);

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

  async findPendingTransactions(): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { status: TransactionStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
  }

  async reconcileTransactions(): Promise<void> {
    const pendingTransactions = await this.findPendingTransactions();
    for (const transaction of pendingTransactions) {
      console.log(`Reconciling transaction ${transaction.id}`);

      if (!transaction.externalTxId) {
        console.warn(
          `Transaction ${transaction.id} has no externalTxId, cannot reconcile`,
        );
        continue;
      }

      try {
        const isTransactionSuccessful = await this.wallet.getTransactionStatus(
          transaction.externalTxId,
        );

        if (isTransactionSuccessful) {
          await this.transactionRepository.update(transaction.id, {
            status: TransactionStatus.COMPLETED,
          });
          console.log(`Transaction ${transaction.id} marked as COMPLETED`);

          if (
            transaction.type === TransactionType.DEPOSIT &&
            transaction.status !== TransactionStatus.COMPLETED
          ) {
            await this.userService.updateBalance(
              transaction.userId,
              transaction.amount,
            );
            console.log(
              `Updated balance for user ${transaction.userId} with amount ${transaction.amount}`,
            );
          }
        } else {
          await this.transactionRepository.update(transaction.id, {
            status: TransactionStatus.FAILED,
          });
          console.log(`Transaction ${transaction.id} marked as FAILED`);
        }
      } catch (error) {
        console.error(
          `Error reconciling transaction ${transaction.id}:`,
          error,
        );
      }
    }
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
