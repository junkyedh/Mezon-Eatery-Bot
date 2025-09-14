import { MessageQueue } from '@app/services/message-queue.service';
import { MezonClientService } from '@app/services/mezon-client.service';
import { CommandService } from '@app/services/command.service';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Events } from 'mezon-sdk';
import { UserService } from '@app/services/user.service';
import { TransactionService } from '@app/services/transaction.service';
import { UserContextService } from '@app/services/user-context.service';
import { MezonWalletService } from '@app/services/mezon-wallet.service';

@Injectable()
export class ChannelMessageListener {
  private readonly logger = new Logger(ChannelMessageListener.name);
  constructor(
    private readonly messageQueue: MessageQueue,
    private readonly userService: UserService,
    private readonly transactionService: TransactionService,
    private readonly mezonClient: MezonClientService,
    private readonly commandService: CommandService,
    private readonly userContext: UserContextService,
    private readonly wallet: MezonWalletService,
  ) {}

  // Handle incoming channel messages (commands)
  @OnEvent(Events.ChannelMessage)
  async handleChannelMessage(message: any) {
    try {
      const botUserId = this.mezonClient.getBotUserId();
      if (botUserId && message.sender_id === botUserId) return;
      const text: string | undefined = message?.content?.t;
      if (!text || !text.startsWith('!')) return;

      // Track user's last channel for future replies (e.g., deposit confirmations)
      if (message?.channel_id) {
        this.userContext.setLastChannel(message.sender_id, message.channel_id);
      }

      const reply = await this.commandService.execute(text, message);
      if (reply) {
        this.messageQueue.addMessage(reply);
      }
    } catch (err) {
      this.logger.error('Error handling channel message', err.stack || err);
    }
  }

  @OnEvent(Events.TokenSend)
  async handleTokenSendEvent(event: any) {
    try {
      this.logger.debug(
        `TokenSend event keys: ${Object.keys(event || {}).join(', ')}`,
      );
      const from_user_id =
        event?.from_user_id || event?.from || event?.sender_id;
      const to_user_id =
        event?.to_user_id ||
        event?.to ||
        event?.receiver_id ||
        event?.target_user_id;
      const tx_id =
        event?.tx_id || event?.transaction_id || event?.txid || event?.id;
      const amount = Number(event?.amount || event?.value || 0);

      if (!from_user_id || !to_user_id || !amount) {
        this.logger.warn('Token send event missing fields');
        return;
      }

      const botUserId = this.mezonClient.getBotUserId();
      if (!botUserId) {
        this.logger.error('Bot user id not available; cannot process deposit');
        return;
      }

      if (to_user_id !== botUserId) return;

      const user = await this.userService.findOrCreateUser(
        from_user_id,
        'Unknown User',
      );

      // Enforce minimum deposit amount with friendly warning (no auto-refund)
      if (Number(amount) < 1000) {
        const amountFormatted = Number(amount).toLocaleString();
        const content =
          `❌ **Giao dịch không được chấp nhận**\n\n` +
          `• Tối thiểu: **1,000 tokens**\n` +
          `• Bạn vừa chuyển: ${amountFormatted} tokens\n` +
          `• Tx: ${tx_id}\n` +
          `\nLưu ý: Bot sẽ không ghi nhận giao dịch này vào số dư.`;

        const lastChannel = this.userContext.getLastChannel(user.mezonUserId);
        const defaultChannel = process.env.MEZON_DEFAULT_CHANNEL_ID;
        if (lastChannel) {
          this.messageQueue.addMessage({
            msg: { t: content },
            channel_id: lastChannel,
            is_public: true,
          });
        } else if (defaultChannel) {
          this.messageQueue.addMessage({
            msg: { t: content },
            channel_id: defaultChannel,
            is_public: true,
          });
        } else {
          this.messageQueue.addMessage({
            textContent: content,
            userId: user.mezonUserId,
          });
        }
        this.logger.warn(
          `Ignored deposit below minimum from ${user.mezonUserId}: ${amount}`,
        );
        return;
      }

      const exists = await this.transactionService.findByExternalTxId(tx_id);
      if (exists) {
        this.logger.log(`Deposit tx ${tx_id} already processed.`);
        return;
      }

      await this.transactionService.recordDeposit({
        userId: user.id,
        amount: Number(amount),
        externalTxId: tx_id,
        source: 'mezon',
      });

      const amountFormatted = Number(amount).toLocaleString();
      const content =
        `🧾 **Nạp Token Thành Công**\n\n` +
        `✅ Số lượng: ${amountFormatted} tokens\n` +
        `🆔 Tx: ${tx_id}`;

      const lastChannel = this.userContext.getLastChannel(user.mezonUserId);
      const defaultChannel = process.env.MEZON_DEFAULT_CHANNEL_ID;
      if (lastChannel) {
        this.messageQueue.addMessage({
          msg: { t: content },
          channel_id: lastChannel,
          is_public: true,
        });
      } else if (defaultChannel) {
        this.messageQueue.addMessage({
          msg: { t: content },
          channel_id: defaultChannel,
          is_public: true,
        });
      } else {
        this.messageQueue.addMessage({
          textContent: content,
          userId: user.mezonUserId,
        });
      }

      this.logger.log(
        `Processed deposit for user ${user.mezonUserId} amount ${amount}`,
      );
    } catch (err) {
      this.logger.error('Error processing token send event', err.stack || err);
    }
  }
}

export { ChannelMessageListener as EventListenerChannelMessage };
