import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWithdrawnFeesToPool1757839460365 implements MigrationInterface {
  name = 'AddWithdrawnFeesToPool1757839460365';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" DROP CONSTRAINT "FK_loans_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" DROP CONSTRAINT "FK_loans_lenderUserId"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_transactions_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_loans_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_loans_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_loans_lenderUserId"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "ncScore"`);
    await queryRunner.query(
      `ALTER TABLE "pools" ADD "withdrawnFees" numeric(15,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."transaction_type_enum" RENAME TO "transaction_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_type_enum" AS ENUM('deposit', 'withdraw', 'loan_payment', 'interest_payment')`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ALTER COLUMN "type" TYPE "public"."transactions_type_enum" USING "type"::"text"::"public"."transactions_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."transaction_type_enum_old"`);
    await queryRunner.query(
      `ALTER TYPE "public"."transaction_status_enum" RENAME TO "transaction_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_status_enum" AS ENUM('pending', 'completed', 'failed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ALTER COLUMN "status" TYPE "public"."transactions_status_enum" USING "status"::"text"::"public"."transactions_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    );
    await queryRunner.query(`DROP TYPE "public"."transaction_status_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "UQ_11a02d187c87d3dc5b0b4949f20" UNIQUE ("idempotency_key")`,
    );
    await queryRunner.query(`ALTER TABLE "loans" DROP COLUMN "lenderUserId"`);
    await queryRunner.query(
      `ALTER TABLE "loans" ADD "lenderUserId" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "loans" DROP COLUMN "fee"`);
    await queryRunner.query(
      `ALTER TABLE "loans" ADD "fee" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ALTER COLUMN "interestRate" SET DEFAULT '16.3'`,
    );
    await queryRunner.query(`ALTER TABLE "loans" DROP COLUMN "termUnit"`);
    await queryRunner.query(
      `CREATE TYPE "public"."loans_termunit_enum" AS ENUM('week', 'month')`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ADD "termUnit" "public"."loans_termunit_enum" NOT NULL DEFAULT 'month'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."loan_status_enum" RENAME TO "loan_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."loans_status_enum" AS ENUM('pending', 'approved', 'active', 'completed', 'defaulted')`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ALTER COLUMN "status" TYPE "public"."loans_status_enum" USING "status"::"text"::"public"."loans_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    );
    await queryRunner.query(`DROP TYPE "public"."loan_status_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "pools" ALTER COLUMN "weeklyInterestRate" SET DEFAULT '0.5'`,
    );
    await queryRunner.query(
      `ALTER TABLE "pools" ALTER COLUMN "monthlyInterestRate" SET DEFAULT '3.5'`,
    );
    await queryRunner.query(
      `ALTER TABLE "pools" ALTER COLUMN "quarterlyInterestRate" SET DEFAULT '3.8'`,
    );
    await queryRunner.query(
      `ALTER TABLE "pools" ALTER COLUMN "yearlyInterestRate" SET DEFAULT '4.85'`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ADD CONSTRAINT "FK_4c2ab4e556520045a2285916d45" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "loans" DROP CONSTRAINT "FK_4c2ab4e556520045a2285916d45"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pools" ALTER COLUMN "yearlyInterestRate" SET DEFAULT 4.85`,
    );
    await queryRunner.query(
      `ALTER TABLE "pools" ALTER COLUMN "quarterlyInterestRate" SET DEFAULT 3.8`,
    );
    await queryRunner.query(
      `ALTER TABLE "pools" ALTER COLUMN "monthlyInterestRate" SET DEFAULT 3.5`,
    );
    await queryRunner.query(
      `ALTER TABLE "pools" ALTER COLUMN "weeklyInterestRate" SET DEFAULT 0.5`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."loan_status_enum_old" AS ENUM('pending', 'approved', 'active', 'completed', 'defaulted')`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ALTER COLUMN "status" TYPE "public"."loan_status_enum_old" USING "status"::"text"::"public"."loan_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    );
    await queryRunner.query(`DROP TYPE "public"."loans_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."loan_status_enum_old" RENAME TO "loan_status_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "loans" DROP COLUMN "termUnit"`);
    await queryRunner.query(`DROP TYPE "public"."loans_termunit_enum"`);
    await queryRunner.query(
      `ALTER TABLE "loans" ADD "termUnit" character varying(10) NOT NULL DEFAULT 'month'`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ALTER COLUMN "interestRate" SET DEFAULT 16.3`,
    );
    await queryRunner.query(`ALTER TABLE "loans" DROP COLUMN "fee"`);
    await queryRunner.query(
      `ALTER TABLE "loans" ADD "fee" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(`ALTER TABLE "loans" DROP COLUMN "lenderUserId"`);
    await queryRunner.query(`ALTER TABLE "loans" ADD "lenderUserId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "UQ_11a02d187c87d3dc5b0b4949f20"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transaction_status_enum_old" AS ENUM('pending', 'completed', 'failed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ALTER COLUMN "status" TYPE "public"."transaction_status_enum_old" USING "status"::"text"::"public"."transaction_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    );
    await queryRunner.query(`DROP TYPE "public"."transactions_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."transaction_status_enum_old" RENAME TO "transaction_status_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transaction_type_enum_old" AS ENUM('deposit', 'withdraw', 'loan_payment', 'interest_payment')`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ALTER COLUMN "type" TYPE "public"."transaction_type_enum_old" USING "type"::"text"::"public"."transaction_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."transaction_type_enum_old" RENAME TO "transaction_type_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "pools" DROP COLUMN "withdrawnFees"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "ncScore" integer NOT NULL DEFAULT '100000'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_loans_lenderUserId" ON "loans" ("lenderUserId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_loans_status" ON "loans" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_loans_userId" ON "loans" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_userId" ON "transactions" ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ADD CONSTRAINT "FK_loans_lenderUserId" FOREIGN KEY ("lenderUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ADD CONSTRAINT "FK_loans_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
