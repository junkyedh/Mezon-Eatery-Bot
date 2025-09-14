import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('pools')
export class Pool {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  totalBalance: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  availableBalance: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  loanedAmount: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0.5 })
  weeklyInterestRate: number;

  @Column('decimal', { precision: 5, scale: 2, default: 3.5 })
  monthlyInterestRate: number;

  @Column('decimal', { precision: 5, scale: 2, default: 3.8 })
  quarterlyInterestRate: number;

  @Column('decimal', { precision: 5, scale: 2, default: 4.85 })
  yearlyInterestRate: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  withdrawnFees: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
