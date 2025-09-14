import { HelpCommand } from '@app/command/help.command';
import { PingCommand } from '@app/command/ping.command';
import { AboutCommand } from '@app/command/about.command';
import { DepositCommand } from '@app/command/deposit.command';
import { WithdrawCommand } from '@app/command/withdraw.command';
import { LoanRequestCommand } from '@app/command/loan-request.command';
import { LoanChecklistCommand } from '@app/command/loan-checklist.command';
import { LoanFundCommand } from '@app/command/loan-fund.command';
import { LoanTransactionCommand } from '@app/command/loan-transaction.command';
import { LoanRepayCommand } from '@app/command/loan-repay.command';
import { BalanceCommand } from '@app/command/balance.command';
import { ClientConfigService } from '@app/config/client.config';
import { BotGateway } from '@app/gateway/bot.gateway';
import { EventListenerChannelMessage } from '@app/listeners';
import { CommandService } from '@app/services/command.service';
import { MessageCommand } from '@app/services/message-command.service';
import { MessageQueue } from '@app/services/message-queue.service';
import { UserContextService } from '@app/services/user-context.service';
import { UserService } from '@app/services/user.service';
import { TransactionService } from '@app/services/transaction.service';
import { PoolService } from '@app/services/pool.service';
import { LoanService } from '@app/services/loan.service';
import { MezonModule } from '@app/modules/mezon.module';
import { User } from '@app/entities/user.entity';
import { Transaction } from '@app/entities/transaction.entity';
import { Loan } from '@app/entities/loan.entity';
import { Pool } from '@app/entities/pool.entity';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListAllCommand } from '@app/command/list-all.command';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([User, Transaction, Loan, Pool]),
    MezonModule,
  ],
  providers: [
    BotGateway,
    ClientConfigService,
    ConfigService,
    CommandService,
    MessageQueue,
    MessageCommand,
    UserContextService,
    UserService,
    TransactionService,
    PoolService,
    LoanService,

    // Listeners
    EventListenerChannelMessage,

    // Commands
    HelpCommand,
    PingCommand,
    AboutCommand,
    DepositCommand,
    WithdrawCommand,
    LoanRequestCommand,
    LoanChecklistCommand,
    LoanFundCommand,
    LoanTransactionCommand,
    LoanRepayCommand,
    BalanceCommand,
    ListAllCommand,
  ],
  controllers: [],
})
export class BotModule {}
