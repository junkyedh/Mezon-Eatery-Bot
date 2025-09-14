import { Injectable, Logger } from '@nestjs/common';
import { MezonWalletService } from './mezon-wallet.service';
import { TransactionService } from './transaction.service';

/**
 * Service responsible for processing webhooks from Mezon
 * A way to synchronize transactions from Mezon's webhook API
 */
@Injectable()
export class WebhookProcessorService {
  private readonly logger = new Logger(WebhookProcessorService.name);

  constructor(
    private mezonWalletService: MezonWalletService,
    private transactionService: TransactionService,
  ) {}

  async processDepositWebhook(webhookData: any): Promise<void> {
    this.logger.log(
      `Processing deposit webhook: ${JSON.stringify(webhookData)}`,
    );

    try {
      if (!this.isValidWebhookData(webhookData)) {
        this.logger.warn('Invalid webhook data');
        return;
      }

      const {
        transaction_id: externalTxId,
        user_id: mezonUserId,
        amount,
        status,
      } = webhookData;

      if (status !== 'completed') {
        this.logger.log(
          `Transaction ${externalTxId} is not completed, status: ${status}`,
        );
        return;
      }

      const existingTx =
        await this.transactionService.findByExternalTxId(externalTxId);
      if (existingTx) {
        this.logger.log(`Transaction ${externalTxId} already processed`);
        return;
      }

      const idempotencyKey = `webhook:${externalTxId}`;
      await this.transactionService.recordDeposit({
        userId: mezonUserId,
        amount,
        externalTxId,
        idempotencyKey,
        source: 'mezon',
      });

      this.logger.log(
        `Successfully processed deposit webhook for transaction ${externalTxId}`,
      );
    } catch (error) {
      this.logger.error('Error processing deposit webhook:', error);
    }
  }

  private isValidWebhookData(data: any): boolean {
    return !!(
      data &&
      data.transaction_id &&
      data.user_id &&
      data.amount &&
      data.status
    );
  }

  /**
   * Endpoint API to receive webhooks from Mezon
   */
  handleWebhook(req: any): Promise<void> {
    return this.processDepositWebhook(req.body);
  }
}
