import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { TransactionService } from '@app/services/transaction.service';
import { UserService } from '@app/services/user.service';

@Command('withdraw', {
  description: 'Rút token từ NCC Credit Pool',
  usage: '!withdraw <amount>',
  category: 'NCC Credit',
  aliases: ['w', 'rút'],
})
export class WithdrawCommand extends CommandMessage {
  constructor(
    private transactionService: TransactionService,
    private userService: UserService,
  ) {
    super();
  }

  async execute(args: string[], message: ChannelMessage) {
    if (args.length < 1) {
      const messageContent = '❌ Vui lòng nhập số lượng token muốn rút.\n\n**Cách sử dụng:** `!withdraw <amount>`\n**Ví dụ:** `!withdraw 2000`';
      return this.replyMessageGenerate({ messageContent }, message);
    }

    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount <= 0) {
      const messageContent = '❌ Số lượng token không hợp lệ. Vui lòng nhập số dương.';
      return this.replyMessageGenerate({ messageContent }, message);
    }

    try {
      // Find user
      const user = await this.userService.getUserByMezonId(message.sender_id);
      if (!user) {
        const messageContent = '❌ Bạn chưa có tài khoản. Vui lòng gửi token trước.';
        return this.replyMessageGenerate({ messageContent }, message);
      }

      // Process withdrawal
      const transaction = await this.transactionService.withdraw(message.sender_id, amount);

      const messageContent = 
        `✅ **Rút token thành công!**\n\n` +
        `💰 **Số lượng:** ${amount.toLocaleString()} tokens\n` +
        `📊 **Số dư hiện tại:** ${(user.balance - amount).toLocaleString()} tokens\n` +
        `🆔 **Transaction ID:** ${transaction.id}\n\n` +
        `💡 *Token đã được chuyển về ví của bạn.*`;

      return this.replyMessageGenerate({ messageContent }, message);
    } catch (error) {
      const messageContent = `❌ **Lỗi:** ${error.message}`;
      return this.replyMessageGenerate({ messageContent }, message);
    }
  }
} 