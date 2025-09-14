import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { LoanService } from '@app/services/loan.service';
import { UserService } from '@app/services/user.service';
import { formatToken } from '@app/utils/token-format';

@Command('transaction', {
  description: 'Xem thông tin khoản vay: !transaction <loanId>',
  usage: '!transaction <loanId>',
  category: 'P2P Loan',
})
export class LoanTransactionCommand extends CommandMessage {
  constructor(
    private loanService: LoanService,
    private userService: UserService,
  ) {
    super();
  }

  async execute(args: string[], message: ChannelMessage) {
    if (!args.length) {
      return this.replyMessageGenerate(
        { messageContent: '❌ Thiếu loanId. Dùng: !transaction <loanId>' },
        message,
      );
    }
    const loanId = args[0];
    try {
      const loan = await this.loanService.getLoanById(loanId);
      if (!loan) {
        return this.replyMessageGenerate(
          { messageContent: '❌ Không tìm thấy khoản vay.' },
          message,
        );
      }
      const statusMap: Record<string, string> = {
        pending: 'Đang chờ',
        active: 'Đang vay',
        completed: 'Đã tất toán',
        approved: 'Đã duyệt',
        defaulted: 'Quá hạn',
      };
      const borrowerUser = await this.userService.getUserById(loan.userId);
      const borrowerName =
        borrowerUser?.username || loan.userId.substring(0, 6);
      let lenderName = '';
      if (loan.lenderUserId) {
        const lenderUser = await this.userService.getUserById(
          loan.lenderUserId,
        );
        lenderName = lenderUser?.username || loan.lenderUserId.substring(0, 6);
      }
      const lines: string[] = [
        `🆔 Giao dịch vay: ${loan.id}`,
        `👥 Người vay: @${borrowerName}`,
      ];
      if (lenderName) lines.push(`💼 Người cho vay: @${lenderName}`);

      // Use consistent real-time repay calculation
      const { totalDue, interestAccrued } =
        this.loanService.calculateRealTimeRepayAmount(loan);
      const timeInfo = this.loanService.calculateAccruedInterest(loan);

      let interestDisplay: string;
      if (loan.status === 'active') {
        interestDisplay = `💸 Lãi tạm tính: ${formatToken(interestAccrued)} (${timeInfo.elapsedDays}/${timeInfo.totalTermDays} ngày)`;
      } else if (loan.status === 'pending') {
        interestDisplay = `💸 Lãi dự kiến: ${formatToken(loan.interestAmount)}`;
      } else if (loan.status === 'completed') {
        interestDisplay = `💸 Lãi đã trả: ${formatToken(interestAccrued)}`;
      } else {
        interestDisplay = `💸 Lãi: ${formatToken(interestAccrued)}`;
      }
      const dueDate = new Date(loan.dueDate);

      lines.push(
        `💰 Số tiền gốc: ${formatToken(loan.amount)}`,
        `📈 Lãi suất năm: ${loan.interestRate}%`,
        `⏱ Kỳ hạn: ${loan.termQuantity} ${loan.termUnit}`,
        `📆 Đáo hạn: ${dueDate.toLocaleDateString('vi-VN')}`,
        interestDisplay,
        `💼 Tổng cần trả: ${formatToken(totalDue)}`,
        `📊 Trạng thái: ${statusMap[loan.status] || loan.status}`,
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
