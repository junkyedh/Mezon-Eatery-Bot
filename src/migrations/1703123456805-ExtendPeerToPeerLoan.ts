import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ExtendPeerToPeerLoan1703123456805 implements MigrationInterface {
  name = 'ExtendPeerToPeerLoan1703123456805';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = 'loans';
    const columnsToAdd: TableColumn[] = [];

    if (!(await queryRunner.hasColumn(table, 'lenderUserId'))) {
      columnsToAdd.push(
        new TableColumn({
          name: 'lenderUserId',
          type: 'uuid',
          isNullable: true,
        }),
      );
    }
    if (!(await queryRunner.hasColumn(table, 'fee'))) {
      columnsToAdd.push(
        new TableColumn({
          name: 'fee',
          type: 'decimal',
          precision: 10,
          scale: 2,
          default: '0',
        }),
      );
    }
    if (!(await queryRunner.hasColumn(table, 'termUnit'))) {
      columnsToAdd.push(
        new TableColumn({
          name: 'termUnit',
          type: 'varchar',
          length: '10',
          default: "'month'",
        }),
      );
    }
    if (!(await queryRunner.hasColumn(table, 'termQuantity'))) {
      columnsToAdd.push(
        new TableColumn({ name: 'termQuantity', type: 'int', default: '0' }),
      );
    }
    if (!(await queryRunner.hasColumn(table, 'startDate'))) {
      columnsToAdd.push(
        new TableColumn({
          name: 'startDate',
          type: 'timestamp',
          isNullable: true,
        }),
      );
    }
    if (!(await queryRunner.hasColumn(table, 'approvedAt'))) {
      columnsToAdd.push(
        new TableColumn({
          name: 'approvedAt',
          type: 'timestamp',
          isNullable: true,
        }),
      );
    }
    if (!(await queryRunner.hasColumn(table, 'repaidAt'))) {
      columnsToAdd.push(
        new TableColumn({
          name: 'repaidAt',
          type: 'timestamp',
          isNullable: true,
        }),
      );
    }

    if (columnsToAdd.length) {
      await queryRunner.addColumns(table, columnsToAdd);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = 'loans';
    const maybeDrop = async (name: string) => {
      if (await queryRunner.hasColumn(table, name)) {
        await queryRunner.dropColumn(table, name);
      }
    };
    await maybeDrop('repaidAt');
    await maybeDrop('approvedAt');
    await maybeDrop('startDate');
    await maybeDrop('termQuantity');
    await maybeDrop('termUnit');
    await maybeDrop('fee');
    await maybeDrop('lenderUserId');
  }
}
