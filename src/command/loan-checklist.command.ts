import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { LoanService } from '@app/services/loan.service';
import { UserService } from '@app/services/user.service';
import { formatToken } from '@app/utils/token-format';

@Command('checklist-loan', {
  description: 'Danh sách yêu cầu vay đang chờ: !checklist-loan',
  usage: '!checklist-loan',
  category: 'P2P Loan',
  aliases: ['cl', 'checklist'],
})
export class LoanChecklistCommand extends CommandMessage {
  constructor(
    private loanService: LoanService,
    private userService: UserService,
  ) {
    super();
  }

  async execute(args: string[], message: ChannelMessage) {
    if (args.length > 0) {
      const messageContent = [
        '❌ Sai cú pháp.',
        '**Cách sử dụng:** `!checklist-loan`',
        '**Alias:** `!cl`',
        '**Mô tả:** Hiển thị tối đa 10 yêu cầu vay đang chờ được giải ngân.',
        'Không cần truyền thêm tham số.',
      ].join('\n');
      return this.replyMessageGenerate({ messageContent }, message);
    }
    const list = await this.loanService.listPendingRequests();
    if (!list.length) {
      return this.replyMessageGenerate(
        { messageContent: '📭 Chưa có yêu cầu vay nào trong hàng chờ.' },
        message,
      );
    }
    const first10 = list.slice(0, 10);
    const borrowerIds = first10.map((l) => l.userId);
    const users = await this.userService.getUsersByIds?.(borrowerIds);
    const usernameMap: Record<string, string> = {};
    if (users) {
      for (const u of users) usernameMap[u.id] = u.username;
    }
    const lines = first10.map((l, idx) => {
      const uname = usernameMap[l.userId] || l.userId.substring(0, 6);
      return [
        `#${idx + 1} 🆔 ${l.id}`,
        `👥 Người vay: @${uname}`,
        `💰 Số tiền: ${formatToken(l.amount)}`,
        `⏱ Kỳ hạn: ${l.termQuantity} ${l.termUnit}`,
        `📈 Lãi suất năm: ${l.interestRate}%`,
        `🧾 Phí: ${formatToken(l.fee)}`,
      ].join('\n');
    });
    const messageContent = [
      '📋 Danh sách yêu cầu vay đang chờ (tối đa 10)',
      lines.join('\n\n'),
      'Dùng !chovay <loanId> để giải ngân.',
    ].join('\n\n');
    return this.replyMessageGenerate({ messageContent }, message);
  }
}
