import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { PoolService } from '@app/services/pool.service';
import { MezonWalletService } from '@app/services/mezon-wallet.service';
import { LoanService } from '@app/services/loan.service';
import { formatToken } from '@app/utils/token-format';
import { UserService } from '@app/services/user.service';

// Admin list: configure via env ADMIN_MZ_USERS (comma-separated mezonUserIds)
function getAdminIds(): string[] {
  const raw = process.env.ADMIN_MZ_USERS || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const runtimeAdminIds = new Set<string>();
const runtimeAdminUsernames = new Set<string>();

function isOwner(mezonUserId: string): boolean {
  const admins = getAdminIds();
  return admins.includes(mezonUserId);
}

function isAdmin(mezonUserId: string, username?: string): boolean {
  if (isOwner(mezonUserId)) return true;
  if (runtimeAdminIds.has(mezonUserId)) return true;
  if (username && runtimeAdminUsernames.has(username.toLowerCase()))
    return true;
  return false;
}

@Command('admin', {
  description: 'Admin commands for pool management',
  usage: '!admin [balance|withdraw|assign]...',
  category: 'Admin',
  aliases: ['adm'],
})
export class AdminCommand extends CommandMessage {
  constructor(
    private poolService: PoolService,
    private mezonWalletService: MezonWalletService,
    private userService: UserService,
    private loanService: LoanService,
  ) {
    super();
  }

  async execute(args: string[], message: ChannelMessage) {
    if (!isAdmin(message.sender_id, message.username)) {
      const messageContent = '❌ Bạn không có quyền thực hiện lệnh này.';
      return this.replyMessageGenerate({ messageContent }, message);
    }

    const subCommand = args[0]?.toLowerCase();

    switch (subCommand) {
      case 'balance':
        return this.showPoolBalance(message);
      case 'withdraw':
        return this.withdrawFromPool(args.slice(1), message);
      case 'debug-fees':
        if (!isOwner(message.sender_id)) {
          const messageContent = '❌ Bạn không có quyền debug fees.';
          return this.replyMessageGenerate({ messageContent }, message);
        }
        return this.debugFees(message);
      case 'reset-pool':
        if (!isOwner(message.sender_id)) {
          const messageContent = '❌ Bạn không có quyền reset pool.';
          return this.replyMessageGenerate({ messageContent }, message);
        }
        return this.resetPool(message);
      case 'reset-loan':
        if (!isOwner(message.sender_id)) {
          const messageContent = '❌ Bạn không có quyền reset loan.';
          return this.replyMessageGenerate({ messageContent }, message);
        }
        return this.resetLoan(args.slice(1), message);
      case 'revoke':
        if (!isOwner(message.sender_id)) {
          const messageContent = '❌ Bạn không có quyền thu hồi admin.';
          return this.replyMessageGenerate({ messageContent }, message);
        }
        return this.revokeAdmin(args.slice(1), message);
      case 'assign':
        if (!isOwner(message.sender_id)) {
          const messageContent = '❌ Bạn không có quyền gán admin.';
          return this.replyMessageGenerate({ messageContent }, message);
        }
        return this.assignAdmin(args.slice(1), message);
      default:
        const base = [
          '📋 Admin',
          '• `!admin balance` - Xem số dư pool',
          '• `!admin withdraw <amount>` - Rút phí từ pool',
        ];
        if (isOwner(message.sender_id)) {
          base.push('• `!admin debug-fees` - Debug fee calculation');
          base.push('• `!admin reset-pool` - Tính lại pool (debug)');
          base.push(
            '• `!admin reset-loan <loanId>` - Reset trạng thái loan (debug)',
          );
          base.push('• `!admin assign @JunKye|@dhduonghan` - Cấp quyền tạm');
          base.push(
            '• `!admin revoke @JunKye|@dhduonghan|all` - Thu hồi quyền',
          );
        }
        const helpText = base.join('\n');
        return this.replyMessageGenerate({ messageContent: helpText }, message);
    }
  }

  async showPoolBalance(message: ChannelMessage) {
    try {
      const poolBalance = await this.poolService.getPoolBalance();
      const feesCollected =
        await this.loanService.getTotalFeesFromActiveAndCompletedLoans();

      const users = await this.userService.getUsersWithPositiveBalance();

      const messageLines = [
        '💰 **Pool Balance**',
        `• Tổng token trong bot: ${formatToken(poolBalance.total)}`,
        `• Khả dụng (user balances): ${formatToken(poolBalance.available)}`,
      ];

      if (users.length > 0) {
        for (const user of users) {
          const shortId = user.mezonUserId
            ? user.mezonUserId.substring(0, 8) + '...'
            : 'N/A';
          const username = user.username || 'Unknown';
          messageLines.push(
            `👤 ${username} (${shortId}): ${formatToken(user.balance)}`,
          );
        }
      } else {
        messageLines.push('👤 Không có user nào có balance dương');
      }

      messageLines.push(
        `• Đang cho vay: ${formatToken(poolBalance.loaned)}`,
        `• Phí giao dịch: ${formatToken(feesCollected)}`,
      );

      const messageContent = messageLines.join('\n');

      return this.replyMessageGenerate({ messageContent }, message);
    } catch (error) {
      const messageContent = `❌ Lỗi: ${error.message}`;
      return this.replyMessageGenerate({ messageContent }, message);
    }
  }

  async debugFees(message: ChannelMessage) {
    try {
      const poolBalance = await this.poolService.getPoolBalance();
      const totalFeesFromLoans =
        await this.loanService.getTotalFeesFromActiveAndCompletedLoans();
      const activeLoans = await this.loanService.getActiveLoansAmount();

      const feeFromPool =
        poolBalance.total - (poolBalance.available + poolBalance.loaned);
      const feeFromLoanService = totalFeesFromLoans;

      const messageContent = [
        '🔍 **Phân tích phí (Debug)**',
        `• Tổng pool: ${formatToken(poolBalance.total)}`,
        `• Khả dụng: ${formatToken(poolBalance.available)}`,
        `• Đang cho vay: ${formatToken(poolBalance.loaned)}`,
        `• Tổng khoản vay đang hoạt động: ${formatToken(activeLoans)}`,
        '',
        '📊 **Tính phí:**',
        `• Phí (theo pool): ${formatToken(Math.max(0, feeFromPool))}`,
        `• Phí (theo loan): ${formatToken(feeFromLoanService)}`,
        '',
        '🎯 **Công thức:**',
        '• Phí pool = tổng - (khả dụng + cho vay)',
        '• Phí loan = tổng phí từ các khoản vay',
      ].join('\n');

      return this.replyMessageGenerate({ messageContent }, message);
    } catch (error) {
      const messageContent = `❌ Debug fees error: ${error.message}`;
      return this.replyMessageGenerate({ messageContent }, message);
    }
  }

  async withdrawFromPool(args: string[], message: ChannelMessage) {
    if (args.length < 1) {
      const messageContent =
        '❌ Vui lòng nhập số lượng token muốn rút.\n\n**Cách dùng:** `!admin withdraw <amount>`';
      return this.replyMessageGenerate({ messageContent }, message);
    }

    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount <= 0) {
      const messageContent =
        '❌ Số token không hợp lệ. Vui lòng nhập số dương.';
      return this.replyMessageGenerate({ messageContent }, message);
    }

    try {
      const poolBalance = await this.poolService.getPoolBalance();
      const rawFees =
        poolBalance.total - (poolBalance.available + poolBalance.loaned);
      const feesCollected = Math.max(0, Math.round(Number(rawFees)));

      if (amount > feesCollected) {
        const messageContent = `❌ Số token rút (${formatToken(amount)}) lớn hơn phí hiện có (${formatToken(feesCollected)}).`;
        return this.replyMessageGenerate({ messageContent }, message);
      }

      const idemKey = `admin_withdraw:${Date.now()}:${message.sender_id}`;

      const walletResult = await this.mezonWalletService.transferBotToUser({
        toUserId: message.sender_id,
        amount,
        idemKey,
      });

      if (!walletResult.success) {
        const messageContent = '❌ Giao dịch thất bại. Vui lòng thử lại sau.';
        return this.replyMessageGenerate({ messageContent }, message);
      }

      await this.poolService.withdrawFee(amount);

      const messageContent = [
        '✅ **Rút phí thành công**',
        `• Số lượng: ${formatToken(amount)}`,
        `• Phí còn lại: ${formatToken(feesCollected - amount)}`,
      ].join('\n');

      return this.replyMessageGenerate({ messageContent }, message);
    } catch (error) {
      const messageContent = `❌ Lỗi: ${error.message}`;
      return this.replyMessageGenerate({ messageContent }, message);
    }
  }

  async assignAdmin(args: string[], message: ChannelMessage) {
    if (args.length < 1) {
      const messageContent =
        '❌ Cách dùng: `!admin assign @JunKye` hoặc `!admin assign @dhduonghan`';
      return this.replyMessageGenerate({ messageContent }, message);
    }
    const raw = args[0].trim();
    const handle = (raw.startsWith('@') ? raw.slice(1) : raw).trim();
    const allowed = ['JunKye', 'dhduonghan'];
    if (!allowed.includes(handle)) {
      const messageContent =
        '❌ Hiện chỉ gán được cho @JunKye hoặc @dhduonghan.';
      return this.replyMessageGenerate({ messageContent }, message);
    }

    const handleToUsernames: Record<string, string[]> = {
      JunKye: ['junkye105', 'junkye'],
      dhduonghan: ['dhduonghan', 'han.duonghai'],
    };
    const candidates = handleToUsernames[handle] || [handle];

    let resolved = false;
    for (const uname of candidates) {
      const u = await this.userService.getUserByUsername(uname);
      if (u?.mezonUserId) {
        runtimeAdminIds.add(u.mezonUserId);
        resolved = true;
      }
      runtimeAdminUsernames.add(uname.toLowerCase());
    }

    const messageContent = resolved
      ? `✅ Đã cấp quyền tạm cho @${handle}. Có thể dùng: !admin balance, !admin withdraw.`
      : `✅ Đã cấp quyền tạm cho @${handle}. Có thể dùng: !admin balance, !admin withdraw.`;
    return this.replyMessageGenerate({ messageContent }, message);
  }

  async revokeAdmin(args: string[], message: ChannelMessage) {
    if (args.length < 1) {
      const messageContent =
        '❌ Cách dùng: `!admin revoke @JunKye|@dhduonghan|all`';
      return this.replyMessageGenerate({ messageContent }, message);
    }

    const raw = args[0].trim();
    const token = (raw.startsWith('@') ? raw.slice(1) : raw).trim();

    if (token.toLowerCase() === 'all') {
      runtimeAdminIds.clear();
      runtimeAdminUsernames.clear();
      const messageContent = '✅ Đã thu hồi toàn bộ quyền admin tạm.';
      return this.replyMessageGenerate({ messageContent }, message);
    }

    const allowed = ['JunKye', 'dhduonghan'];
    if (!allowed.includes(token)) {
      const messageContent =
        '❌ Hiện chỉ thu hồi được của @JunKye hoặc @dhduonghan.';
      return this.replyMessageGenerate({ messageContent }, message);
    }

    const handleToUsernames: Record<string, string[]> = {
      JunKye: ['junkye105', 'junkye'],
      dhduonghan: ['dhduonghan', 'han.duonghai'],
    };
    const candidates = handleToUsernames[token] || [token];

    for (const uname of candidates) {
      runtimeAdminUsernames.delete(uname.toLowerCase());
      const u = await this.userService.getUserByUsername(uname);
      if (u?.mezonUserId) runtimeAdminIds.delete(u.mezonUserId);
    }

    const messageContent = `✅ Đã thu hồi quyền tạm của @${token}.`;
    return this.replyMessageGenerate({ messageContent }, message);
  }

  async resetPool(message: ChannelMessage) {
    try {
      await this.poolService.recalculatePool();

      const poolBalance = await this.poolService.getPoolBalance();
      const rawFees =
        poolBalance.total - (poolBalance.available + poolBalance.loaned);
      const feesCollected = Math.max(0, Math.round(Number(rawFees)));

      const messageContent = [
        '✅ **Pool đã được tính lại**',
        `• Tổng token trong bot: ${formatToken(poolBalance.total)}`,
        `• Khả dụng (user balances): ${formatToken(poolBalance.available)}`,
        `• Đang cho vay: ${formatToken(poolBalance.loaned)}`,
        `• Phí giao dịch: ${formatToken(feesCollected)}`,
      ].join('\n');

      return this.replyMessageGenerate({ messageContent }, message);
    } catch (error) {
      const messageContent = `❌ Lỗi khi tính lại pool: ${error.message}`;
      return this.replyMessageGenerate({ messageContent }, message);
    }
  }

  async resetLoan(args: string[], message: ChannelMessage) {
    if (args.length < 1) {
      const messageContent =
        '❌ Thiếu loanId. Cú pháp: `!admin reset-loan <loanId>`';
      return this.replyMessageGenerate({ messageContent }, message);
    }

    const loanId = args[0];

    try {
      const loan = await this.loanService.getLoanById(loanId);

      if (!loan) {
        const messageContent = `❌ Không tìm thấy loan với ID: ${loanId}`;
        return this.replyMessageGenerate({ messageContent }, message);
      }

      await this.loanService.resetLoanToActive(loanId);

      await this.poolService.recalculatePool();

      const messageContent = [
        '✅ **Loan đã được reset thành công**',
        `🆔 Loan ID: ${loanId}`,
        `📊 Trạng thái: ACTIVE`,
        `💰 Số tiền: ${formatToken(loan.amount)}`,
        '🔄 Pool đã được tính lại',
      ].join('\n');

      return this.replyMessageGenerate({ messageContent }, message);
    } catch (error) {
      const messageContent = `❌ Lỗi khi reset loan: ${error.message}`;
      return this.replyMessageGenerate({ messageContent }, message);
    }
  }
}
