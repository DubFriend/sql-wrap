// @flow

import Promise from 'bluebird';

const rawPool = require('mysql').createPool({
  host: '127.0.0.1',
  user: 'root',
  password: 'password',
  database: 'test',
  multipleStatements: true,
});

exports.pool = {
  query: ({
    sql,
    nestTables,
    values,
  }: {
    sql: string,
    nestTables?: boolean,
    values?: Array<mixed>,
  }) =>
    new Promise((resolve, reject) => {
      rawPool.query(
        { sql, nestTables, values },
        (err, results) => (err ? reject(err) : resolve(results))
      );
    }),
  stream: ({
    sql,
    nestTables,
    values,
  }: {
    sql: string,
    nestTables?: boolean,
    values?: Array<mixed>,
  }) => rawPool.query({ sql, nestTables, values }).stream(),
  getConnection: () =>
    new Promise((resolve, reject) => {
      rawPool.getConnection((err, connection) => {
        if (err) {
          reject(err);
        } else if (connection) {
          resolve({
            stream: ({ sql, nestTables, values }) => {
              if (connection && typeof connection.stream === 'function') {
                return connection.stream({ sql, nestTables, values }).stream();
              } else {
                throw new Error('connection.stream is not a function');
              }
            },
            query: ({ sql, nestTables, values }) =>
              new Promise((resolve, reject) => {
                (connection &&
                  typeof connection.query === 'function' &&
                  connection.query(
                    { sql, nestTables, values },
                    (err, results) => (err ? reject(err) : resolve(results))
                  )) ||
                  reject(new Error('connection.query is not a function'));
              }),
            release: () => {
              if (connection && typeof connection.release === 'function') {
                connection.release();
              } else {
                throw new Error('connection.release is not a function');
              }
            },
          });
        } else {
          reject(new Error('connection not found'));
        }
      });
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
    exports.truncateTable('timestamp'),
  ]);

exports.insert = (table: string, row: Array<mixed> | mixed): Promise<*> =>
  exports.pool.query({
    sql: `INSERT INTO \`${table}\` SET ?`,
    values: Array.isArray(row) ? row : [row],
  });
