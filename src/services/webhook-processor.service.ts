import { Injectable, Logger } from '@nestjs/common';
import { MezonWalletService } from './mezon-wallet.service';
import { TransactionService } from './transaction.service';

/**
 * Service chịu trách nhiệm kiểm tra và xác nhận các giao dịch nhận token qua webhook
 * Một cách để đồng bộ giao dịch từ webhook API của Mezon
 */
@Injectable()
export class WebhookProcessorService {
  private readonly logger = new Logger(WebhookProcessorService.name);

  constructor(
    private mezonWalletService: MezonWalletService,
    private transactionService: TransactionService,
  ) {}

  /**
   * Xử lý webhook từ Mezon để cập nhật giao dịch nạp tiền
   * @param webhookData dữ liệu từ webhook của Mezon
   */
  async processDepositWebhook(webhookData: any): Promise<void> {
    this.logger.log(
      `Processing deposit webhook: ${JSON.stringify(webhookData)}`,
    );

    try {
      // Kiểm tra dữ liệu webhook hợp lệ
      if (!this.isValidWebhookData(webhookData)) {
        this.logger.warn('Invalid webhook data');
        return;
      }

      // Trích xuất thông tin giao dịch
      const {
        transaction_id: externalTxId,
        user_id: mezonUserId,
        amount,
        status,
      } = webhookData;

      // Kiểm tra trạng thái giao dịch
      if (status !== 'completed') {
        this.logger.log(
          `Transaction ${externalTxId} is not completed, status: ${status}`,
        );
        return;
      }

      // Kiểm tra xem giao dịch đã được xử lý chưa
      const existingTx =
        await this.transactionService.findByExternalTxId(externalTxId);
      if (existingTx) {
        this.logger.log(`Transaction ${externalTxId} already processed`);
        return;
      }

      // Xử lý giao dịch nạp tiền
      const idempotencyKey = `webhook:${externalTxId}`;
      await this.transactionService.recordDeposit({
        userId: mezonUserId, // Chú ý: Cần chuyển đổi từ mezonUserId sang userId trong thực tế
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
    // Kiểm tra dữ liệu webhook hợp lệ
    return !!(
      data &&
      data.transaction_id &&
      data.user_id &&
      data.amount &&
      data.status
    );
  }

  /**
   * Endpoint API để nhận webhook từ Mezon
   */
  handleWebhook(req: any): Promise<void> {
    return this.processDepositWebhook(req.body);
  }
}
