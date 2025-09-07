import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNCCCreditTables1703123456789 implements MigrationInterface {
  name = 'CreateNCCCreditTables1703123456789';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "mezonUserId" character varying NOT NULL,
        "username" character varying NOT NULL,
        "ncScore" integer NOT NULL DEFAULT '100000',
        "balance" integer NOT NULL DEFAULT '0',
        "jobLevel" character varying,
        "tenure" integer,
        "isBlocked" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_mezonUserId" UNIQUE ("mezonUserId"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    // Create transactions table
    await queryRunner.query(`
      CREATE TYPE "public"."transaction_type_enum" AS ENUM('deposit', 'withdraw', 'loan_payment', 'interest_payment')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."transaction_status_enum" AS ENUM('pending', 'completed', 'failed')
    `);

    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "type" "public"."transaction_type_enum" NOT NULL,
        "amount" decimal(10,2) NOT NULL,
        "status" "public"."transaction_status_enum" NOT NULL DEFAULT 'pending',
        "description" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transactions" PRIMARY KEY ("id")
      )
    `);

    // Create loans table
    await queryRunner.query(`
      CREATE TYPE "public"."loan_status_enum" AS ENUM('pending', 'approved', 'active', 'completed', 'defaulted')
    `);

    await queryRunner.query(`
      CREATE TABLE "loans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "amount" decimal(10,2) NOT NULL,
        "interestRate" decimal(5,2) NOT NULL DEFAULT '16.3',
        "status" "public"."loan_status_enum" NOT NULL DEFAULT 'pending',
        "dueDate" date NOT NULL,
        "paidAmount" integer NOT NULL DEFAULT '0',
        "missedPayments" integer NOT NULL DEFAULT '0',
        "description" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loans" PRIMARY KEY ("id")
      )
    `);

    // Create pools table
    await queryRunner.query(`
      CREATE TABLE "pools" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "totalBalance" decimal(15,2) NOT NULL DEFAULT '0',
        "availableBalance" decimal(15,2) NOT NULL DEFAULT '0',
        "loanedAmount" decimal(15,2) NOT NULL DEFAULT '0',
        "weeklyInterestRate" decimal(5,2) NOT NULL DEFAULT '0.5',
        "monthlyInterestRate" decimal(5,2) NOT NULL DEFAULT '3.5',
        "quarterlyInterestRate" decimal(5,2) NOT NULL DEFAULT '3.8',
        "yearlyInterestRate" decimal(5,2) NOT NULL DEFAULT '4.85',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pools" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_userId" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "loans" ADD CONSTRAINT "FK_loans_userId" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_transactions_userId" ON "transactions" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_loans_userId" ON "loans" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_loans_status" ON "loans" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "loans" DROP CONSTRAINT "FK_loans_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_userId"`,
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_loans_status"`);
    await queryRunner.query(`DROP INDEX "IDX_loans_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_transactions_userId"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "pools"`);
    await queryRunner.query(`DROP TABLE "loans"`);
    await queryRunner.query(`DROP TABLE "transactions"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "public"."loan_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."transaction_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."transaction_type_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
