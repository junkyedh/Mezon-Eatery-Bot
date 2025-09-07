import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendLoanPeerToPeer1703123456800 implements MigrationInterface {
  name = 'ExtendLoanPeerToPeer1703123456800';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "loans" ADD COLUMN "lenderUserId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ADD COLUMN "fee" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ADD COLUMN "interestAmount" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ADD COLUMN "totalRepayAmount" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ADD CONSTRAINT "FK_loans_lenderUserId" FOREIGN KEY ("lenderUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_loans_lenderUserId" ON "loans" ("lenderUserId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_loans_lenderUserId"`);
    await queryRunner.query(
      `ALTER TABLE "loans" DROP CONSTRAINT IF EXISTS "FK_loans_lenderUserId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" DROP COLUMN IF EXISTS "totalRepayAmount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" DROP COLUMN IF EXISTS "interestAmount"`,
    );
    await queryRunner.query(`ALTER TABLE "loans" DROP COLUMN IF EXISTS "fee"`);
    await queryRunner.query(
      `ALTER TABLE "loans" DROP COLUMN IF EXISTS "lenderUserId"`,
    );
  }
}
