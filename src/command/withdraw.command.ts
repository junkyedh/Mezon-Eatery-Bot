import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { TransactionService } from '@app/services/transaction.service';
import { UserService } from '@app/services/user.service';
import { MezonWalletService } from '@app/services/mezon-wallet.service';
import { formatToken } from '@app/utils/token-format';

@Command('withdraw', {
  description: 'Rút token từ NCC Credit Pool',
  usage: '!withdraw <amount>',
  category: 'NCC Credit',
  aliases: ['w', 'rút'],
})
export class WithdrawCommand extends CommandMessage {
  constructor(
    private transactionService: TransactionService,
    private userService: UserService,
    private mezonWalletService: MezonWalletService,
  ) {
    super();
  }

  async execute(args: string[], message: ChannelMessage) {
    if (args.length < 1) {
      const messageContent =
        '❌ Vui lòng nhập số lượng token muốn rút.\n\n**Cách sử dụng:** `!withdraw <amount>`\n**Ví dụ:** `!withdraw 2000`';
      return this.replyMessageGenerate({ messageContent }, message);
    }

    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount <= 0) {
      const messageContent =
        '❌ Số lượng token không hợp lệ. Vui lòng nhập số dương.';
      return this.replyMessageGenerate({ messageContent }, message);
    }
    if (amount < 1000) {
      const messageContent =
        '⚠️ Số tiền rút tối thiểu là 1,000 tokens. Vui lòng thử lại với số tiền lớn hơn.';
      return this.replyMessageGenerate({ messageContent }, message);
    }

    try {
      const user = await this.userService.getUserByMezonId(message.sender_id);
      if (!user) {
        const messageContent =
          '❌ Bạn chưa có tài khoản. Vui lòng gửi token trước.';
        return this.replyMessageGenerate({ messageContent }, message);
      }

      if (user.balance < amount) {
        const messageContent = '❌ Số dư không đủ để thực hiện giao dịch.';
        return this.replyMessageGenerate({ messageContent }, message);
      }

      const idemKey = `${message.message_id || Date.now()}::withdraw::${message.sender_id}`;

      const walletResult = await this.mezonWalletService.transferBotToUser({
        toUserId: message.sender_id,
        amount,
        idemKey,
      });

      if (!walletResult.success) {
        const messageContent =
          '❌ Giao dịch trên Mezon thất bại. Vui lòng thử lại sau.';
        return this.replyMessageGenerate({ messageContent }, message);
      }

      let transactionId = 'N/A';
      let updatedBalance = user.balance;
      try {
        const transaction = await this.transactionService.withdraw(
          user.id,
          amount,
          walletResult.externalTxId,
          idemKey,
          'mezon',
        );
        transactionId = transaction.id;
        const fresh = await this.userService.getUserById(user.id);
        updatedBalance = fresh?.balance ?? user.balance - amount;
      } catch (dbErr) {
        console.error('DB update failed after successful withdraw:', dbErr);
        const messageContent =
          `⚠️ Token đã được chuyển nhưng cập nhật số dư tạm thời chưa thành công.\n` +
          `💰 Số lượng: ${formatToken(amount)} tokens\n` +
          `🔗 External Tx ID: ${walletResult.externalTxId || 'N/A'}\n` +
          `🛠️ Hệ thống sẽ tự đồng bộ trong ít phút.`;
        return this.replyMessageGenerate({ messageContent }, message);
      }

      const messageContent =
        `✅ **Rút Token Thành Công!**\n` +
        `💰 Số lượng: ${formatToken(amount)} tokens\n` +
        `📊 Số dư hiện tại: ${formatToken(updatedBalance)} tokens\n` +
        `🆔 Transaction ID: ${transactionId}\n` +
        `💡 *Token đã được chuyển về ví của bạn.*`;

      return this.replyMessageGenerate({ messageContent }, message);
    } catch (error) {
      const messageContent = `❌ **Lỗi:** ${error.message}`;
      return this.replyMessageGenerate({ messageContent }, message);
    }
  }
}
