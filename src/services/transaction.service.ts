import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionType, TransactionStatus } from '@app/entities/transaction.entity';
import { UserService } from './user.service';
import { PoolService } from './pool.service';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private userService: UserService,
    private poolService: PoolService,
  ) {}

  async deposit(userId: string, amount: number): Promise<Transaction> {
    // Validate minimum amount
    if (amount < 1000) {
      throw new Error('Minimum deposit amount is 1,000 tokens');
    }

    const transaction = this.transactionRepository.create({
      userId,
      type: TransactionType.DEPOSIT,
      amount,
      status: TransactionStatus.COMPLETED,
      description: `Deposit ${amount} tokens`,
    });

    await this.transactionRepository.save(transaction);

    // Update user balance
    await this.userService.updateBalance(userId, amount);

    // Update pool balance
    await this.poolService.addToPool(amount);

    return transaction;
  }

  async withdraw(userId: string, amount: number): Promise<Transaction> {
    // Validate minimum amount
    if (amount < 1000) {
      throw new Error('Minimum withdrawal amount is 1,000 tokens');
    }

    const user = await this.userService.getUserByMezonId(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.balance < amount) {
      throw new Error('Insufficient balance');
    }

    const transaction = this.transactionRepository.create({
      userId: user.id,
      type: TransactionType.WITHDRAW,
      amount,
      status: TransactionStatus.COMPLETED,
      description: `Withdraw ${amount} tokens`,
    });

    await this.transactionRepository.save(transaction);

    // Update user balance
    await this.userService.updateBalance(user.id, -amount);

    // Update pool balance
    await this.poolService.removeFromPool(amount);

    return transaction;
  }

  async getTransactionHistory(userId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 10,
    });
  }
} 