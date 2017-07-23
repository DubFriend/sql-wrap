// @flow

import Promise from 'bluebird';

const rawPool = require('mysql').createPool({
  host: '127.0.0.1',
  user: 'root',
  password: 'password',
  database: 'test',
});

exports.pool = {
  query: ({ sql, values }: { sql: string, values?: Array<mixed> }) =>
    new Promise((resolve, reject) => {
      rawPool.query(
        { sql, values },
        (err, results) => (err ? reject(err) : resolve(results))
      );
    }),
  getConnection: () =>
    new Promise((resolve, reject) => {
      rawPool.getConnection(
        (err, connection) => (err ? reject(err) : resolve(connection))
      );
    }),
};

exports.truncateTable = (table: string) =>
  exports.pool.query({
    sql: 'TRUNCATE TABLE ??',
    values: [table],
  });

exports.all = (table: string) =>
  exports.pool.query({
    sql: `SELECT * FROM ??`,
    values: [table],
  });

exports.clearAllTables = () =>
  Promise.all([
    exports.truncateTable('autoInc'),
    exports.truncateTable('compoundKey'),
    exports.truncateTable('defaultValue'),
    exports.truncateTable('key'),
  ]);

exports.insert = (table: string, row: Object): Promise<*> =>
  exports.pool.query({
    sql: `INSERT INTO \`${table}\` SET ?`,
    values: [row],
  });
