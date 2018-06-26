// @flow
import type { SqlWrapConnectionPool } from './type';

module.exports = (rawPool: *): SqlWrapConnectionPool => ({
  query: ({
    text,
    nestTables,
    values,
  }: {
    text: string,
    nestTables?: boolean,
    values?: Array<any>,
  }) =>
    new Promise((resolve, reject) => {
      rawPool.query(
        { sql: text, nestTables, values },
        (err, results) => (err ? reject(err) : resolve(results))
      );
    }),
  stream: ({
    text,
    nestTables,
    values,
  }: {
    text: string,
    nestTables?: boolean,
    values?: Array<any>,
  }) => rawPool.query({ sql: text, nestTables, values }).stream(),
  getConnection: () =>
    new Promise((resolve, reject) => {
      rawPool.getConnection((err, connection: any) => {
        if (err) {
          reject(err);
        } else if (connection) {
          resolve({
            stream: ({ text, nestTables, values }) => {
              if (connection && typeof connection.stream === 'function') {
                return connection
                  .stream({ sql: text, nestTables, values })
                  .stream();
              } else {
                throw new Error('connection.stream is not a function');
              }
            },
            query: ({ text, nestTables, values }) =>
              new Promise((resolve, reject) => {
                (connection &&
                  typeof connection.query === 'function' &&
                  connection.query(
                    { sql: text, nestTables, values },
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
