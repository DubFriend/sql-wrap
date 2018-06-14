// @flow

import type {
  SqlWrapConnection,
  SqlWrapConnectionPool,
  // SqlWrapInputValues,
  // SqlWrapQueryConfig,
  // SqlWrapSelectConfig,
  SqlWrapType,
  // SqlWrapQueryWriteOutput,
  // SqlWrapOrderByObject,
  Value,
} from './type';

// import type { Readable } from 'stream';

import sqlString from 'sqlstring';
import createQuery from './query';
import createRead from './read';
import createWrite from './write';
import mysqlDriverAdaper from './mysql-driver-adapter';
import TemplatedValue from './templated-value';

// export type SqlWrapQueryBuilder = _SqlWrapQueryBuilder;

// export type SqlWrap = {|
//   connection: () => Promise<*>,
//   release: () => void,
//   query: (
//     textOrConfig: string | SqlWrapQueryConfig,
//     maybeValues?: SqlWrapInputValues
//   ) => Promise<
//     | SqlWrapQueryWriteOutput
//     | Array<Object>
//     | { results: Array<Object>, resultCount: number }
//   >,
//   one: (
//     textOrConfig: string | SqlWrapQueryConfig,
//     maybeValues?: SqlWrapInputValues
//   ) => Promise<SqlWrapQueryWriteOutput | Object | null>,
//   select: (
//     tableOrConfig: string | SqlWrapSelectConfig,
//     maybeWhere?: Object
//   ) => Promise<Array<Object> | { results: Array<Object>, resultCount: number }>,
//   selectOne: (
//     tableOrConfig: string | SqlWrapSelectConfig,
//     maybeWhere?: Object
//   ) => Promise<Object | null>,
//   stream: (
//     textOrConfig: string | SqlWrapQueryConfig,
//     maybeValues?: SqlWrapInputValues
//   ) => Readable,
//   streamTable: (
//     tableOrConfig: string | SqlWrapSelectConfig,
//     maybeWhere?: Object
//   ) => Readable,
//   queryStream: (
//     textOrConfig: string | SqlWrapQueryConfig,
//     maybeValues?: SqlWrapInputValues
//   ) => Promise<Readable>,
//   selectStream: (
//     tableOrConfig: string | SqlWrapSelectConfig,
//     maybeWhere?: Object
//   ) => Promise<Readable>,
//   insert: (
//     table: string,
//     rowOrRows: Array<Object> | Object
//   ) => Promise<Array<SqlWrapQueryWriteOutput> | SqlWrapQueryWriteOutput>,
//   update: (table: string, updates: *, where?: *) => Promise<*>,
//   delete: (table: string, where?: Object | Array<Object>) => Promise<*>,
//   save: (
//     table: string,
//     rowOrRows: Array<Object> | Object
//   ) => Promise<Array<SqlWrapQueryWriteOutput> | SqlWrapQueryWriteOutput>,
//   replace: (
//     table: string,
//     rowOrRows: Array<Object> | Object
//   ) => Promise<Array<SqlWrapQueryWriteOutput> | SqlWrapQueryWriteOutput>,
//   build: () => _SqlWrapQueryBuilder,
//   escape: (data: mixed) => string,
//   escapeId: (data: string) => string,
//   encodeCursor: (
//     orderBy:
//       | string
//       | SqlWrapOrderByObject
//       | Array<string | SqlWrapOrderByObject>,
//     row: Object
//   ) => string,
//   templatedValue: *,
// |};
export type SqlWrap = {|
  connection: *,
  release: *,
  query: *,
  queryPaginated: *,
  one: *,
  select: *,
  selectOne: *,
  stream: *,
  streamTable: *,
  queryStream: *,
  selectStream: *,
  insert: *,
  update: *,
  delete: *,
  save: *,
  replace: *,
  build: *,
  escape: *,
  escapeId: *,
  encodeCursor: *,
  templatedValue: *,
|};

const templatedValue = (template: string, ...args: Array<Value>) =>
  new TemplatedValue(template, ...args);

const createSqlWrap = ({
  driver,
  sqlType,
}: {
  driver: SqlWrapConnectionPool | SqlWrapConnection,
  sqlType: SqlWrapType,
}): SqlWrap => {
  const query = createQuery({ driver, sqlType });
  const read = createRead({ driver, sqlType });
  const write = createWrite({ driver, sqlType });

  const self = {
    connection: () =>
      query
        .getConnection()
        .then(conn => createSqlWrap({ driver: conn, sqlType })),
    release: () => {
      if (driver.release && typeof driver.release === 'function') {
        driver.release();
      } else {
        throw new TypeError('release is not a function');
      }
    },
    query: (...args: *) => query.rows(...args),
    one: (...args: *) => query.row(...args),
    select: (...args: *) => read.select(...args),
    selectOne: (...args: *) => read.selectOne(...args),
    stream: (...args: *) => query.stream(...args),
    streamTable: (...args: *) => read.stream(...args),
    queryStream: (...args: *) => Promise.resolve(query.stream(...args)),
    selectStream: (...args: *) => Promise.resolve(read.stream(...args)),
    insert: (...args: *) => write.insert(...args),
    update: (...args: *) => write.update(...args),
    delete: (...args: *) => write.delete(...args),
    save: (...args: *) => write.save(...args),
    replace: (...args: *) => write.replace(...args),
    build: () => query.build(),
    escape: (...args: *) => sqlString.escape(...args),
    escapeId: (...args: *) => sqlString.escapeId(...args),
    encodeCursor: (...args: *) => query.encodeCursor(...args),
    templatedValue,
  };

  return self;
};

createSqlWrap.templatedValue = templatedValue;

createSqlWrap.mysqlDriverAdaper = mysqlDriverAdaper;

module.exports = createSqlWrap;
