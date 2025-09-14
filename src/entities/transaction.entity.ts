import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  LOAN_PAYMENT = 'loan_payment',
  INTEREST_PAYMENT = 'interest_payment',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export type TransactionSource = 'mezon' | 'manual';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ nullable: true })
  description: string;

  @Column({
    name: 'external_tx_id',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  externalTxId?: string;

  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 128,
    nullable: true,
    unique: true,
  })
  idempotencyKey?: string;

  @Column({
    name: 'source',
    type: 'enum',
    enum: ['mezon', 'manual'],
    nullable: true,
  })
  source?: TransactionSource;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.transactions)
  @JoinColumn({ name: 'userId' })
  user: User;
}
