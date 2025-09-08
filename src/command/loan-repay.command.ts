import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { LoanService } from '@app/services/loan.service';
import { UserService } from '@app/services/user.service';
import { formatToken } from '@app/utils/token-format';

@Command('repay', {
  description: 'Trả hết khoản vay: !repay <loanId>',
  usage: '!repay <loanId>',
  category: 'P2P Loan',
})
export class LoanRepayCommand extends CommandMessage {
  constructor(
    private loanService: LoanService,
    private userService: UserService,
  ) {
    super();
  }

  async execute(args: string[], message: ChannelMessage) {
    if (!args.length) {
      return this.replyMessageGenerate(
        { messageContent: '❌ Thiếu loanId. Dùng: !repay <loanId>' },
        message,
      );
    }
    const loanId = args[0];
    try {
      await this.userService.findOrCreateUser(
        message.sender_id,
        message.username || 'Unknown',
      );
      const result = await this.loanService.repayLoan({
        loanId,
        mezonUserId: message.sender_id,
      });
      const borrowerUser = await this.userService.getUserById(
        result.loan.userId,
      );
      const borrowerName =
        borrowerUser?.username || result.loan.userId.substring(0, 6);
      let lenderName = '';
      if (result.loan.lenderUserId) {
        const lenderUser = await this.userService.getUserById(
          result.loan.lenderUserId,
        );
        lenderName =
          lenderUser?.username || result.loan.lenderUserId.substring(0, 6);
      }
      const lines: string[] = [
        '✅ **Đã Tất Toán Khoản Vay**\n',
        `🆔 Giao dịch vay: ${result.loan.id}`,
        `👥 Người vay: @${borrowerName}`,
      ];
      if (lenderName) lines.push(`💼 Người cho vay: @${lenderName}`);
      lines.push(
        `💰 Gốc đã trả: ${formatToken(result.principalPortion)}`,
        `📈 Lãi đã trả: ${formatToken(result.interestPortion)}`,
        `🧾 Phí ban đầu: ${formatToken(result.fee)}`,
        `💸 Tổng đã trả: ${formatToken(result.totalDue)}`,
      );
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
