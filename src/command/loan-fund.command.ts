import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { LoanService } from '@app/services/loan.service';
import { UserService } from '@app/services/user.service';
import { formatToken } from '@app/utils/token-format';

@Command('loan-fund', {
  description: 'Cho vay 1 yêu cầu: !loan-fund <loanId>',
  usage: '!loan-fund <loanId>',
  category: 'P2P Loan',
})
export class LoanFundCommand extends CommandMessage {
  constructor(
    private loanService: LoanService,
    private userService: UserService,
  ) {
    super();
  }

  async execute(args: string[], message: ChannelMessage) {
    if (args.length < 1) {
      return this.replyMessageGenerate(
        { messageContent: '❌ Thiếu loanId. Dùng: !loan-fund <loanId>' },
        message,
      );
    }
    const loanId = args[0];
    try {
      await this.userService.findOrCreateUser(
        message.sender_id,
        message.username || 'Unknown',
      );
      const loan = await this.loanService.fundLoan({
        loanId,
        lenderMezonUserId: message.sender_id,
      });
      const borrowerUser = await this.userService.getUserById(loan.userId);
      const borrowerName =
        borrowerUser?.username || loan.userId.substring(0, 6);
      const lenderName = message.username || 'Ban';
      const lines: string[] = [
        '✅ Đã giải ngân khoản vay.',
        `🆔 Loan: ${loan.id}`,
        `👥 Người vay: @${borrowerName}`,
        `💼 Người cho vay: @${lenderName}`,
        `💰 Số tiền: ${formatToken(loan.amount)} (nhận thực: ${formatToken(loan.amount - loan.fee)})`,
        `🧾 Phí bot: ${formatToken(loan.fee)}`,
        `📈 Lãi suất năm: ${loan.interestRate}%`,
        `📆 Đáo hạn: ${loan.dueDate.toLocaleDateString('vi-VN')}`,
        '⚠️ Người vay sẽ phải trả cả gốc + lãi khi tất toán. Phí đã bị trừ ngay khi nhận.',
      ];
      const messageContent = lines.join('\n');
      return this.replyMessageGenerate({ messageContent }, message);
    } catch (e) {
      return this.replyMessageGenerate(
        { messageContent: '❌ ' + e.message },
        message,
      );
    }
  }
}
