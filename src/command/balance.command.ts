import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { UserService } from '@app/services/user.service';
import { LoanService } from '@app/services/loan.service';
import { formatToken } from '@app/utils/token-format';

@Command('balance', {
  description: 'Kiểm tra số dư và thông tin NCC Credit Pool',
  usage: '!balance',
  category: 'NCC Credit',
  aliases: ['bal', 'sốdư'],
})
export class BalanceCommand extends CommandMessage {
  constructor(
    private userService: UserService,
    private loanService: LoanService,
  ) {
    super();
  }

  async execute(args: string[], message: ChannelMessage) {
    try {
      // Get user info
      const user = await this.userService.findOrCreateUser(
        message.sender_id,
        message.username || 'Unknown User',
      );
      // Tính thâm niên (năm) dựa trên thời điểm user tham gia (proxy: createdAt trong hệ thống)
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

      // Active loan summary (if any)
      const activeLoan = await this.loanService.getActiveLoan(
        message.sender_id,
      );
      let loanLines: string[] = [];
      let capacityLines: string[] = [];
      const baseCapacity = user.ncScore * 0.5;
      let remainingCapacity = baseCapacity;
      if (activeLoan) {
        const acc = this.loanService.calculateAccruedInterest(activeLoan);
        const totalDue = activeLoan.amount + acc.interestAccrued;
        remainingCapacity = Math.max(baseCapacity - activeLoan.amount, 0);
        loanLines = [
          '📌 **Khoản vay đang hoạt động**',
          `🆔 Loan: ${activeLoan.id}`,
          `💰 Gốc: ${formatToken(activeLoan.amount)}`,
          `📈 Lãi suất năm: ${activeLoan.interestRate}%`,
          `💸 Lãi tạm tính: ${formatToken(acc.interestAccrued)} tokens`,
          `💼 Tổng tạm phải trả: ${formatToken(totalDue)} tokens`,
          `📆 Đáo hạn: ${activeLoan.dueDate.toLocaleDateString('vi-VN')} (còn ${Math.max(acc.totalTermDays - acc.elapsedDays, 0)} ngày)`,
        ];
      }
      capacityLines = [
        '📊 **Hạn mức vay**',
        `• Hạn mức cơ sở: ${formatToken(baseCapacity)} tokens`,
        `• Hạn mức còn lại: ${formatToken(remainingCapacity)} tokens`,
      ];

      const messageContent = [
        '💰 **NCC Credit Balance**',
        `👤 **Người dùng:** ${user.username}`,
        `💳 **Số dư NCC Credit:** ${formatToken(user.balance)} tokens`,
        `🎯 **NC Score:** ${formatToken(user.ncScore)} điểm`,
        `🏢 **Vai trò (Role):** ${user.jobLevel || 'Chưa cập nhật'}`,
        `⏰ **Thâm niên Mezon:** ${tenureDisplay}`,
        ...loanLines,
        ...capacityLines,
      ].join('\n');

      return this.replyMessageGenerate({ messageContent }, message);
    } catch (error) {
      const messageContent = `❌ **Lỗi:** ${error.message}`;
      return this.replyMessageGenerate({ messageContent }, message);
    }
  }
}
