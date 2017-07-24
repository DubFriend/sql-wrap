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
      rawPool.getConnection((err, connection) => {
        if (err) {
          reject(err);
        } else if (connection) {
          resolve({
            query: ({ sql, values }) =>
              new Promise((resolve, reject) => {
                (connection &&
                  typeof connection.query === 'function' &&
                  connection.query(
                    { sql, values },
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
      // rawPool.getConnection(
      //   (err, connection) =>
      //     err
      //       ? reject(err)
      //       : resolve({
      //           // connection
      //           query: ({
      //             sql,
      //             values,
      //           }: {
      //             sql: string,
      //             values?: Array<mixed>,
      //           }) =>
      //             new Promise((resolve, reject) => {
      //               connection.query(
      //                 { sql, values },
      //                 (err, results) => (err ? reject(err) : resolve(results))
      //               );
      //             }),
      //         })
      // );
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

exports.insert = (table: string, row: Array<mixed> | mixed): Promise<*> =>
  exports.pool.query({
    sql: `INSERT INTO \`${table}\` SET ?`,
    values: Array.isArray(row) ? row : [row],
  });
