import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { TransactionService } from '@app/services/transaction.service';
import { UserService } from '@app/services/user.service';

@Command('deposit', {
  description: 'Gửi token vào NCC Credit Pool',
  usage: '!deposit <amount>',
  category: 'NCC Credit',
  aliases: ['d', 'gửi'],
})
export class DepositCommand extends CommandMessage {
  constructor(
    private transactionService: TransactionService,
    private userService: UserService,
  ) {
    super();
  }

  async execute(args: string[], message: ChannelMessage) {
    if (args.length < 1) {
      const messageContent = '❌ Vui lòng nhập số lượng token muốn gửi.\n\n**Cách sử dụng:** `!deposit <amount>`\n**Ví dụ:** `!deposit 5000`';
      return this.replyMessageGenerate({ messageContent }, message);
    }

    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount <= 0) {
      const messageContent = '❌ Số lượng token không hợp lệ. Vui lòng nhập số dương.';
      return this.replyMessageGenerate({ messageContent }, message);
    }

    try {
      // Find or create user
      const user = await this.userService.findOrCreateUser(
        message.sender_id,
        message.username || 'Unknown User'
      );

      // Process deposit
      const transaction = await this.transactionService.deposit(user.id, amount);

      const messageContent = 
        `✅ **Gửi token thành công!**\n\n` +
        `💰 **Số lượng:** ${amount.toLocaleString()} tokens\n` +
        `📊 **Số dư hiện tại:** ${user.balance.toLocaleString()} tokens\n` +
        `🆔 **Transaction ID:** ${transaction.id}\n\n` +
        `💡 *Token đã được chuyển vào NCC Credit Pool và sẽ được tính lãi theo lịch trình.*`;

      return this.replyMessageGenerate({ messageContent }, message);
    } catch (error) {
      const messageContent = `❌ **Lỗi:** ${error.message}`;
      return this.replyMessageGenerate({ messageContent }, message);
    }
  }
} 