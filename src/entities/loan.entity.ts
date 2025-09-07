import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum LoanStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DEFAULTED = 'defaulted',
}
export type LoanTermUnit = 'week' | 'month';

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  // Lender (user A) - null until funded
  @Column({ nullable: true })
  lenderUserId?: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  // Transaction fee (flat amount) charged to borrower at disbursement
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  fee: number;

  @Column('decimal', { precision: 5, scale: 2, default: 16.3 })
  interestRate: number; // 16.3% per year

  // Loan term definition
  @Column({ type: 'enum', enum: ['week', 'month'], default: 'month' })
  termUnit: LoanTermUnit;

  // Number of term units (weeks or months)
  @Column({ type: 'int', default: 0 })
  termQuantity: number;

  // Store original term in days for interest calculation
  @Column('int', { default: 0 })
  termDays: number;

  // Precomputed interest amount for the full term
  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  interestAmount: number;

  // Total repay = principal + interestAmount
  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalRepayAmount: number;

  @Column({
    type: 'enum',
    enum: LoanStatus,
    default: LoanStatus.PENDING,
  })
  status: LoanStatus;

  @Column({ type: 'date' })
  dueDate: Date;

  // Lifecycle timestamps
  @Column({ type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  repaidAt: Date;

  @Column({ default: 0 })
  paidAmount: number;

  @Column({ default: 0 })
  missedPayments: number;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.loans)
  @JoinColumn({ name: 'userId' })
  user: User;
}
