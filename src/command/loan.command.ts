import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { LoanService } from '@app/services/loan.service';
import { UserService } from '@app/services/user.service';

@Command('loan', {
  description: 'Đăng ký khoản vay',
  usage: '!loan <amount> <days>',
  category: 'NCC Credit',
  aliases: ['vay', 'borrow'],
})
export class LoanCommand extends CommandMessage {
  constructor(
    private loanService: LoanService,
    private userService: UserService,
  ) {
    super();
  }

  async execute(args: string[], message: ChannelMessage) {
    if (args.length < 2) {
      const messageContent = 
        '❌ Vui lòng nhập đầy đủ thông tin.\n\n' +
        '**Cách sử dụng:** `!loan <amount> <days>`\n' +
        '**Ví dụ:** `!loan 5000 30`\n\n' +
        '💡 *Lãi suất: 16.3%/năm*';
      return this.replyMessageGenerate({ messageContent }, message);
    }

    const amount = parseInt(args[0]);
    const days = parseInt(args[1]);

    if (isNaN(amount) || amount <= 0) {
      const messageContent = '❌ Số tiền vay không hợp lệ. Vui lòng nhập số dương.';
      return this.replyMessageGenerate({ messageContent }, message);
    }

    if (isNaN(days) || days <= 0 || days > 365) {
      const messageContent = '❌ Số ngày không hợp lệ. Vui lòng nhập từ 1-365 ngày.';
      return this.replyMessageGenerate({ messageContent }, message);
    }

    try {
      // Find or create user
      const user = await this.userService.findOrCreateUser(
        message.sender_id,
        message.username || 'Unknown User'
      );

      // Request loan
      const loan = await this.loanService.requestLoan(message.sender_id, amount, days);

      const dueDate = new Date(loan.dueDate);
      const interestAmount = (amount * 16.3 * days) / (365 * 100);
      const totalAmount = amount + interestAmount;

      const messageContent = 
        `✅ **Đăng ký vay thành công!**\n\n` +
        `💰 **Số tiền vay:** ${amount.toLocaleString()} tokens\n` +
        `📅 **Kỳ hạn:** ${days} ngày\n` +
        `📆 **Ngày đáo hạn:** ${dueDate.toLocaleDateString('vi-VN')}\n` +
        `💸 **Lãi suất:** 16.3%/năm\n` +
        `📊 **Tổng tiền phải trả:** ${totalAmount.toFixed(0)} tokens\n` +
        `🆔 **Loan ID:** ${loan.id}\n\n` +
        `⚠️ *Vui lòng thanh toán đúng hạn để tránh bị khóa tài khoản.*`;

      return this.replyMessageGenerate({ messageContent }, message);
    } catch (error) {
      const messageContent = `❌ **Lỗi:** ${error.message}`;
      return this.replyMessageGenerate({ messageContent }, message);
    }
  }
} 