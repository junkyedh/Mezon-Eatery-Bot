import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { UserService } from '@app/services/user.service';
import { LoanService } from '@app/services/loan.service';
import { formatToken } from '@app/utils/token-format';

@Command('score', {
  description: 'Kiểm tra NC Score và thông tin tài khoản',
  usage: '!score',
  category: 'NCC Credit',
  aliases: ['ncscore', 'điểm'],
})
export class ScoreCommand extends CommandMessage {
  constructor(
    private userService: UserService,
    private loanService: LoanService,
  ) {
    super();
  }

  async execute(args: string[], message: ChannelMessage) {
    try {
      // Find or create user
      const user = await this.userService.findOrCreateUser(
        message.sender_id,
        message.username || 'Unknown User',
      );
      const now = Date.now();
      const createdTime = user.createdAt
        ? new Date(user.createdAt).getTime()
        : now;
      const tenureYears = Math.max(
        (now - createdTime) / (365 * 24 * 60 * 60 * 1000),
        0,
      );
      const tenureDisplay =
        tenureYears < 1 ? '< 1 năm' : `${Math.floor(tenureYears)} năm`;

      const status = user.isBlocked ? '🚫 **Bị khóa**' : '✅ **Hoạt động**';

      const baseCapacity = user.ncScore * 0.5;

      // Active loan & capacity left
      const activeLoan = await this.loanService.getActiveLoan(
        message.sender_id,
      );
      let activeLoanLines: string[] = [];
      let remainingCapacity = baseCapacity;
      if (activeLoan) {
        const acc = this.loanService.calculateAccruedInterest(activeLoan);
        const totalDue = activeLoan.amount + acc.interestAccrued;
        remainingCapacity = Math.max(baseCapacity - activeLoan.amount, 0);
        activeLoanLines = [
          '📌 Khoản vay đang hoạt động:',
          `• ID: ${activeLoan.id}`,
          `• Gốc: ${formatToken(activeLoan.amount)}`,
          `• Lãi tạm tính: ${formatToken(acc.interestAccrued)} tokens`,
          `• Tổng tạm phải trả: ${formatToken(totalDue)} tokens`,
          `• Đáo hạn: ${activeLoan.dueDate.toLocaleDateString('vi-VN')} (còn ${Math.max(acc.totalTermDays - acc.elapsedDays, 0)} ngày)`,
        ];
      }

      // Interest rate reference tiers
      const tiers = [
        '� Khung lãi suất tham chiếu / năm:',
        '• Tuần: 0.5%',
        '• Tháng: 3.5%',
        '• Quý: 3.8%',
        '• Năm: 4.85%',
        'Lãi thực tế tính pro‑rata theo số ngày vay.',
      ];

      const messageContent = [
        '📊 **NC Score Report**',
        `👤 Người dùng: ${user.username}`,
        `🎯 NC Score: ${formatToken(user.ncScore)} điểm`,
        `💰 Số dư: ${formatToken(user.balance)} tokens`,
        `🏢 Vai trò (Role): ${user.jobLevel || 'Chưa cập nhật'}`,
        `⏰ Thâm niên Mezon: ${tenureDisplay}`,
        `📈 Hạn mức vay cơ sở: ${formatToken(baseCapacity)} tokens`,
        ...(activeLoanLines.length
          ? activeLoanLines
          : ['📌 Không có khoản vay đang hoạt động']),
        `💳 Hạn mức còn lại khả dụng: ${formatToken(remainingCapacity)} tokens`,
        `🔒 Trạng thái: ${status}`,
        '',
        ...tiers,
        '',
        '� Dùng !loan <sotien> <songay> để tạo yêu cầu vay.',
      ].join('\n');

      return this.replyMessageGenerate({ messageContent }, message);
    } catch (error) {
      const messageContent = `❌ **Lỗi:** ${error.message}`;
      return this.replyMessageGenerate({ messageContent }, message);
    }
  }
}
