import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddComputedLoanColumns1703123456810 implements MigrationInterface {
  name = 'AddComputedLoanColumns1703123456810';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = 'loans';
    const add = async (col: TableColumn) => {
      if (!(await queryRunner.hasColumn(table, col.name))) {
        await queryRunner.addColumn(table, col);
      }
    };
    await add(new TableColumn({ name: 'termDays', type: 'int', default: '0' }));
    await add(
      new TableColumn({
        name: 'interestAmount',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: '0',
      }),
    );
    await add(
      new TableColumn({
        name: 'totalRepayAmount',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: '0',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = 'loans';
    const drop = async (name: string) => {
      if (await queryRunner.hasColumn(table, name)) {
        await queryRunner.dropColumn(table, name);
      }
    };
    await drop('totalRepayAmount');
    await drop('interestAmount');
    await drop('termDays');
  }
}
