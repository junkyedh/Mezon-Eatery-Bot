import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Transaction } from './transaction.entity';
import { Loan } from './loan.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  mezonUserId: string;

  @Column()
  username: string;

  @Column({ default: 100000 })
  ncScore: number;

  @Column({ default: 0 })
  balance: number;

  @Column({ nullable: true })
  jobLevel: string;

  @Column({ nullable: true })
  tenure: number;

  @Column({ default: false })
  isBlocked: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions: Transaction[];

  @OneToMany(() => Loan, (loan) => loan.user)
  loans: Loan[];
}
