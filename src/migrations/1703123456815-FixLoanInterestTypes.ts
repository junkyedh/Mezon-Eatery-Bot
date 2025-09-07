import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixLoanInterestTypes1703123456815 implements MigrationInterface {
  name = 'FixLoanInterestTypes1703123456815';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('loans');
    if (!table) return;
    const interestCol = table.columns.find((c) => c.name === 'interestAmount');
    const totalCol = table.columns.find((c) => c.name === 'totalRepayAmount');

    // Normalize to numeric(12,2) only if not already numeric/decimal with scale 2
    if (interestCol && !/numeric|decimal/i.test(interestCol.type)) {
      await queryRunner.query(
        'ALTER TABLE "loans" ALTER COLUMN "interestAmount" TYPE numeric(12,2) USING "interestAmount"::numeric',
      );
    }
    if (totalCol && !/numeric|decimal/i.test(totalCol.type)) {
      await queryRunner.query(
        'ALTER TABLE "loans" ALTER COLUMN "totalRepayAmount" TYPE numeric(12,2) USING "totalRepayAmount"::numeric',
      );
    }
  }

  public async down(): Promise<void> {
    // No down conversion (lossy). If needed could cast to integer, but we skip for safety.
  }
}
