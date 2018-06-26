// @flow

const rawPool = require('mysql').createPool({
  host: '127.0.0.1',
  user: 'root',
  password: 'password',
  database: 'test',
  multipleStatements: true,
});

import mysqlDriverAdaper from '../mysql-driver-adapter';

exports.pool = mysqlDriverAdaper(rawPool);

exports.truncateTable = (table: string) =>
  exports.pool.query({
    text: 'TRUNCATE TABLE ??',
    values: [table],
  });

exports.all = (table: string) =>
  exports.pool.query({
    text: `SELECT * FROM ??`,
    values: [table],
  });

exports.clearAllTables = () =>
  Promise.all([
    exports.truncateTable('autoInc'),
    exports.truncateTable('compoundKey'),
    exports.truncateTable('defaultValue'),
    exports.truncateTable('key'),
    exports.truncateTable('timestamp'),
  ]);

exports.insert = (table: *, row: any) =>
  exports.pool.query({
    text: `INSERT INTO \`${table}\` SET ?`,
    values: Array.isArray(row) ? row : [row],
  });
