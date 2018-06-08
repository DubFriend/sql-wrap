// @flow
import type { SqlWrapConnectionPool } from './type';

module.exports = (rawPool: *): SqlWrapConnectionPool => ({
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
      rawPool.getConnection((err, connection: any) => {
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
});
