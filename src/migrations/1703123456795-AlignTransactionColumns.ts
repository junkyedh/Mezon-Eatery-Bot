import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignTransactionColumns1703123456795
  implements MigrationInterface
{
  name = 'AlignTransactionColumns1703123456795';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure columns exist with correct names; if camelCase columns were created earlier, rename them
    const table = await queryRunner.getTable('transactions');
    if (table) {
      const extCamel = table.findColumnByName('externalTxId');
      if (extCamel && !table.findColumnByName('external_tx_id')) {
        await queryRunner.query(
          'ALTER TABLE "transactions" RENAME COLUMN "externalTxId" TO "external_tx_id"',
        );
      }
      const idemCamel = table.findColumnByName('idempotencyKey');
      if (idemCamel && !table.findColumnByName('idempotency_key')) {
        await queryRunner.query(
          'ALTER TABLE "transactions" RENAME COLUMN "idempotencyKey" TO "idempotency_key"',
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('transactions');
    if (table) {
      const ext = table.findColumnByName('external_tx_id');
      if (ext && !table.findColumnByName('externalTxId')) {
        await queryRunner.query(
          'ALTER TABLE "transactions" RENAME COLUMN "external_tx_id" TO "externalTxId"',
        );
      }
      const idem = table.findColumnByName('idempotency_key');
      if (idem && !table.findColumnByName('idempotencyKey')) {
        await queryRunner.query(
          'ALTER TABLE "transactions" RENAME COLUMN "idempotency_key" TO "idempotencyKey"',
        );
      }
    }
  }
}
