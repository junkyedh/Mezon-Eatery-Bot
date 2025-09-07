import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddExternalTxIdAndIdempotencyKey1703123456790
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'transactions',
      new TableColumn({
        name: 'external_tx_id',
        type: 'varchar',
        length: '128',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'transactions',
      new TableColumn({
        name: 'idempotency_key',
        type: 'varchar',
        length: '128',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'transactions',
      new TableColumn({
        name: 'source',
        type: 'enum',
        enum: ['mezon', 'manual'],
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('transactions', 'external_tx_id');
    await queryRunner.dropColumn('transactions', 'idempotency_key');
    await queryRunner.dropColumn('transactions', 'source');
  }
}
