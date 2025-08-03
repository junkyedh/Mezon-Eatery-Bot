import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { UserService } from '@app/services/user.service';

@Command('score', {
  description: 'Kiểm tra NC Score và thông tin tài khoản',
  usage: '!score',
  category: 'NCC Credit',
  aliases: ['ncscore', 'điểm'],
})
export class ScoreCommand extends CommandMessage {
  constructor(
    private userService: UserService,
  ) {
    super();
  }

  async execute(args: string[], message: ChannelMessage) {
    try {
      // Find or create user
      const user = await this.userService.findOrCreateUser(
        message.sender_id,
        message.username || 'Unknown User'
      );

      const maxLoanAmount = Math.floor(user.ncScore * 0.5);
      const status = user.isBlocked ? '🚫 **Bị khóa**' : '✅ **Hoạt động**';

      const messageContent = 
        `📊 **NC Score Report**\n\n` +
        `👤 **Người dùng:** ${user.username}\n` +
        `🎯 **NC Score:** ${user.ncScore.toLocaleString()} điểm\n` +
        `💰 **Số dư:** ${user.balance.toLocaleString()} tokens\n` +
        `🏢 **Cấp bậc:** ${user.jobLevel || 'Chưa cập nhật'}\n` +
        `⏰ **Thâm niên:** ${user.tenure || 0} năm\n` +
        `📈 **Hạn mức vay tối đa:** ${maxLoanAmount.toLocaleString()} tokens\n` +
        `🔒 **Trạng thái:** ${status}\n\n` +
        `💡 *NC Score ảnh hưởng đến hạn mức vay và lãi suất.*`;

      return this.replyMessageGenerate({ messageContent }, message);
    } catch (error) {
      const messageContent = `❌ **Lỗi:** ${error.message}`;
      return this.replyMessageGenerate({ messageContent }, message);
    }
  }
} 