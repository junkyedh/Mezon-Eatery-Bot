import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { UserService } from '@app/services/user.service';

@Command('balance', {
  description: 'Kiểm tra số dư và thông tin NCC Credit Pool',
  usage: '!balance',
  category: 'NCC Credit',
  aliases: ['bal', 'sốdư'],
})
export class BalanceCommand extends CommandMessage {
  constructor(private userService: UserService) {
    super();
  }

  async execute(args: string[], message: ChannelMessage) {
    try {
      // Get user info
      const user = await this.userService.findOrCreateUser(
        message.sender_id,
        message.username || 'Unknown User',
      );

      const messageContent =
        `💰 **NCC Credit Balance**\n\n` +
        `👤 **Người dùng:** ${user.username}\n` +
        `💳 **Số dư NCC Credit:** ${user.balance.toLocaleString()} tokens\n` +
        `🎯 **NC Score:** ${user.ncScore.toLocaleString()} điểm`;

      return this.replyMessageGenerate({ messageContent }, message);
    } catch (error) {
      const messageContent = `❌ **Lỗi:** ${error.message}`;
      return this.replyMessageGenerate({ messageContent }, message);
    }
  }
}
