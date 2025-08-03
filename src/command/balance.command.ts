import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { UserService } from '@app/services/user.service';
import { PoolService } from '@app/services/pool.service';
import { LoanService } from '@app/services/loan.service';

@Command('balance', {
  description: 'Kiểm tra số dư và thông tin NCC Credit Pool',
  usage: '!balance',
  category: 'NCC Credit',
  aliases: ['bal', 'sốdư'],
})
export class BalanceCommand extends CommandMessage {
  constructor(
    private userService: UserService,
    private poolService: PoolService,
    private loanService: LoanService,
  ) {
    super();
  }

  async execute(args: string[], message: ChannelMessage) {
    try {
      // Get user info
      const user = await this.userService.findOrCreateUser(
        message.sender_id,
        message.username || 'Unknown User'
      );

      // Get pool balance
      const poolBalance = await this.poolService.getPoolBalance();

      // Get active loan
      const activeLoan = await this.loanService.getActiveLoan(message.sender_id);

      let loanInfo = '';
      if (activeLoan) {
        const remainingAmount = activeLoan.amount - activeLoan.paidAmount;
        const dueDate = new Date(activeLoan.dueDate);
        loanInfo = 
          `\n📋 **Thông tin khoản vay:**\n` +
          `💰 **Số tiền vay:** ${activeLoan.amount.toLocaleString()} tokens\n` +
          `💳 **Đã trả:** ${activeLoan.paidAmount.toLocaleString()} tokens\n` +
          `📊 **Còn lại:** ${remainingAmount.toLocaleString()} tokens\n` +
          `📅 **Ngày đáo hạn:** ${dueDate.toLocaleDateString('vi-VN')}\n` +
          `⚠️ **Lần trễ hạn:** ${activeLoan.missedPayments}`;
      }

      const messageContent = 
        `💰 **NCC Credit Balance Report**\n\n` +
        `👤 **Người dùng:** ${user.username}\n` +
        `💳 **Số dư cá nhân:** ${user.balance.toLocaleString()} tokens\n` +
        `🎯 **NC Score:** ${user.ncScore.toLocaleString()} điểm\n\n` +
        `🏦 **NCC Credit Pool:**\n` +
        `📊 **Tổng số dư:** ${poolBalance.total.toLocaleString()} tokens\n` +
        `💵 **Khả dụng:** ${poolBalance.available.toLocaleString()} tokens\n` +
        `📈 **Đã cho vay:** ${poolBalance.loaned.toLocaleString()} tokens\n\n` +
        `💡 **Lãi suất tiết kiệm:**\n` +
        `• Tuần: 0.5%/năm\n` +
        `• Tháng: 3.5%/năm\n` +
        `• Quý: 3.8%/năm\n` +
        `• Năm: 4.85%/năm` +
        loanInfo;

      return this.replyMessageGenerate({ messageContent }, message);
    } catch (error) {
      const messageContent = `❌ **Lỗi:** ${error.message}`;
      return this.replyMessageGenerate({ messageContent }, message);
    }
  }
} 