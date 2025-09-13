import { CommandMessage } from '@app/command/common/command.abstract';
import { Command } from '@app/decorators/command.decorator';
import { TransactionService } from '@app/services/transaction.service';
import { UserService } from '@app/services/user.service';
import { formatToken } from '@app/utils/token-format';
import { ChannelMessage } from 'mezon-sdk';

@Command('list-all', {
  description: 'Hiển thị lịch sử giao dịch: !list-all',
  usage: '!list-all',
  category: 'P2P Loan',
  aliases: ['la'],
})
export class ListAllCommand extends CommandMessage {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly userService: UserService,
  ) {
    super();
  }

  async execute(args: string[], message: ChannelMessage) {
    if (args.length > 0) {
      const messageContent = [
        '❌ Sai cú pháp.',
        '**Cách sử dụng:** `!list-all`',
        '**Alias:** `!la`',
        '**Mô tả:** Hiển thị lịch sử giao dịch (tối đa 10 transactions).',
        'Không cần truyền thêm tham số.',
      ].join('\n');
      return this.replyMessageGenerate({ messageContent }, message);
    }
    try {
      const user = await this.userService.findOrCreateUser(
        message.sender_id,
        message.username || 'Unknown',
      );
      const list = await this.transactionService.getTransactionHistory(user.id);
      if (!list.length) {
        return this.replyMessageGenerate(
          { messageContent: '📭 Chưa có transaction nào.' },
          message,
        );
      }
      const lines = list.map((l, idx) => {
        return [
          `#${idx + 1} 🆔 ${l.id}`,
          `👥 Người chuyển tiền: @${user.username}`,
          `💰 Số tiền: ${formatToken(l.amount)}`,
          `⏱ Trạng thái: ${l.status}`,
          `📈 Type: ${l.type}`,
          `🧾 Mô tả: ${l.description}`,
        ].join('\n');
      });
      const messageContent = [
        '📋 Lịch sử giao dịch (tối đa 10 transactions).',
        lines.join('\n\n'),
      ].join('\n\n');
      return this.replyMessageGenerate({ messageContent }, message);
    } catch (error) {
      const messageContent = `❌ **Lỗi:** ${error.message}`;
      return this.replyMessageGenerate({ messageContent }, message);
    }
  }
}
