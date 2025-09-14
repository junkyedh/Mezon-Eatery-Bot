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

      const activeLoan = await this.loanService.getActiveLoan(
        message.sender_id,
      );
      let loanLines: string[] = [];

      if (activeLoan) {
        const { totalDue, interestAccrued } =
          this.loanService.calculateRealTimeRepayAmount(activeLoan);
        const acc = this.loanService.calculateAccruedInterest(activeLoan);

        const dueDate =
          activeLoan.dueDate instanceof Date
            ? activeLoan.dueDate
            : new Date(activeLoan.dueDate);

        loanLines = [
          '',
          '📋 **Khoản vay đang hoạt động (1)**',
          '',
          `♦️ **Khoản vay #1**`,
          `🆔 Mã giao dịch: ${activeLoan.id}`,
          `💰 Gốc: ${formatToken(activeLoan.amount)}`,
          `📈 Lãi suất năm: ${activeLoan.interestRate}%`,
          `💸 Lãi tạm tính: ${formatToken(interestAccrued)}`,
          `💼 Tổng tạm phải trả: ${formatToken(totalDue)}`,
          `📅 Đáo hạn: ${dueDate.toLocaleDateString('vi-VN')} (còn ${Math.max(acc.totalTermDays - acc.elapsedDays, 0)} ngày)`,
        ];
      }

      const messageContent = [
        '💰 **NCC Credit Balance**',
        `👤 Người dùng: ${user.username}`,
        `💳 Số dư NCC Credit: ${formatToken(user.balance)}`,
        `🏢 Vai trò (Role): ${user.jobLevel || 'Chưa cập nhật'}`,
        `⏰ Thâm niên Mezon: ${tenureDisplay}`,
        ...loanLines,
      ].join('\n');

      return this.replyMessageGenerate({ messageContent }, message);
    } catch (error) {
      const messageContent = `❌ **Lỗi:** ${error.message}`;
      return this.replyMessageGenerate({ messageContent }, message);
    }
  }
}
