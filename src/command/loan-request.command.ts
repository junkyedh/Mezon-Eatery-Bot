import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { LoanService } from '@app/services/loan.service';
import { UserService } from '@app/services/user.service';
import { formatToken } from '@app/utils/token-format';

@Command('loan', {
  description: 'Yêu cầu khoản vay nhanh: !loan <sotien> <songay>',
  usage: '!loan 10000 30',
  category: 'P2P Loan',
})
export class LoanRequestCommand extends CommandMessage {
  constructor(
    private loanService: LoanService,
    private userService: UserService,
  ) {
    super();
  }

  async execute(args: string[], message: ChannelMessage) {
    if (args.length < 2) {
      const note = [
        '📋 **Hướng Dẫn Yêu Cầu Vay**\n',
        'ℹ️ Cú pháp: `!loan <sotien> <songay>`',
        'Ví dụ: `!loan 15000 30`',
        '—',
        '💸 Phí giao dịch cố định (trừ khi giải ngân): 5,000 tokens',
        '💡 Lãi suất tham chiếu theo năm:',
        '• Tuần: 0.5%',
        '• Tháng: 3.5%',
        '• Quý: 3.8%',
        '• Năm: 4.85%',
        '👉 Lãi tính pro‑rata theo số ngày dựa trên kỳ hạn.',
        'Sau khi tạo khoản vay sẽ vào hàng chờ để người khác `!chovay`.',
      ].join('\n');
      return this.replyMessageGenerate({ messageContent: note }, message);
    }

    const amount = parseInt(args[0]);
    const days = parseInt(args[1]);
    const baseRates = {
      week: 0.5, // %/year
      month: 3.5,
      quarter: 3.8,
      year: 4.85,
    };
    const fee = 5000;

    if (isNaN(amount) || amount < 1000) {
      return this.replyMessageGenerate(
        { messageContent: '❌ Số tiền vay tối thiểu 1,000.' },
        message,
      );
    }
    if (isNaN(days) || days <= 0 || days > 365) {
      return this.replyMessageGenerate(
        { messageContent: '❌ Số ngày không hợp lệ (1-365).' },
        message,
      );
    }

    let termUnit: 'week' | 'month';
    let termQuantity: number;
    if (days >= 84 && days % 30 === 0) {
      termUnit = 'month';
      termQuantity = days / 30;
    } else if (days % 30 === 0) {
      termUnit = 'month';
      termQuantity = days / 30;
    } else if (days % 7 === 0) {
      termUnit = 'week';
      termQuantity = days / 7;
    } else {
      termUnit = 'week';
      termQuantity = Math.ceil(days / 7);
    }

    let annualRate: number;
    if (days >= 360) annualRate = baseRates.year;
    else if (days >= 90) annualRate = baseRates.quarter;
    else if (days >= 30) annualRate = baseRates.month;
    else annualRate = baseRates.week;

    try {
      await this.userService.findOrCreateUser(
        message.sender_id,
        message.username || 'Unknown',
      );
      const loan = await this.loanService.createLoanRequest({
        mezonUserId: message.sender_id,
        amount,
        interestRate: annualRate,
        termUnit,
        termQuantity,
        fee,
      });
      const borrowerName = message.username || loan.userId.substring(0, 6);
      const interest = amount * (annualRate / 100) * (days / 365);
      const total = amount + interest;
      const disbursed = Math.max(amount - fee, 0);
      const dueDate = new Date(loan.dueDate);

      const messageContent = [
        '✅ Tạo yêu cầu vay thành công',
        `🆔 Mã khoản vay: ${loan.id}`,
        `👥 Người vay: @${borrowerName}`,
        `💰 Số tiền vay: ${formatToken(amount)} tokens`,
        `📅 Kỳ hạn yêu cầu: ${days} ngày (${termQuantity} ${termUnit})`,
        `📆 Ngày đáo hạn dự kiến: ${dueDate.toLocaleDateString('vi-VN')}`,
        `💸 Phí giao dịch: ${formatToken(fee)} (trừ khi giải ngân)`,
        `📈 Lãi suất tham chiếu: ${annualRate}%/năm (tạm tính lãi: ${formatToken(interest)} tokens)`,
        `📊 Tổng phải trả (ước tính): ${formatToken(total)} tokens`,
        `📤 Thực nhận (sau phí): ${formatToken(disbursed)} tokens`,
        `🗂 Đã vào hàng chờ. Người cho vay dùng: !chovay ${loan.id}`,
        '⚠️ Lãi tính pro‑rata theo ngày; có thể thay đổi nếu tất toán sớm.',
      ].join('\n');
      return this.replyMessageGenerate({ messageContent }, message);
    } catch (e) {
      return this.replyMessageGenerate(
        { messageContent: '❌ ' + e.message },
        message,
      );
    }
  }
}
