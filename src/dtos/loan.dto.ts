import { Loan } from '@app/entities/loan.entity';
import { Type } from 'class-transformer';

export class LoanDto extends Loan {
  @Type(() => Date)
  dueDate: Date;
}
