// @flow
import type { SqlWrapConnectionPool, Value } from './type';

const mapValues = (v: Value): mixed => {
  if (v instanceof Date) {
    const s = v.toISOString();
    return s.replace('T', ' ').substring(0, s.length - 5);
  } else {
    return v;
  }
};

module.exports = (rawPool: *): SqlWrapConnectionPool => ({
  query: ({
    sql,
    nestTables,
    values,
  }: {
    sql: string,
    nestTables?: boolean,
    values?: Array<Value>,
  }) =>
    new Promise((resolve, reject) => {
      rawPool.query(
        { sql, nestTables, values: values && values.map(mapValues) },
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
    values?: Array<Value>,
  }) =>
    rawPool
      .query({ sql, nestTables, values: values && values.map(mapValues) })
      .stream(),
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
