import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { TransactionService } from '@app/services/transaction.service';
import { UserService } from '@app/services/user.service';
import { formatToken } from '@app/utils/token-format';

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
    const amount = parseInt(args[0] || '0');

    try {
      await this.userService.findOrCreateUser(
        message.sender_id,
        message.username || 'Unknown User',
      );

      const prettyAmount =
        amount > 0 ? `**${formatToken(amount)}** token ` : '';
      const messageContent =
        `🧾 **Hướng Dẫn Nạp Token**` +
        `➡️ Chuyển ${prettyAmount}trực tiếp cho bot qua Mezon transfer.\n` +
        `✅ Bot nhận được sẽ cập nhật số dư của bạn.`;

      return this.replyMessageGenerate({ messageContent }, message);
    } catch (error) {
      const messageContent = `❌ **Lỗi:** ${error.message}`;
      return this.replyMessageGenerate({ messageContent }, message);
    }
  }
}
