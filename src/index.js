// @flow

import type {
  SqlWrapConnection,
  SqlWrapConnectionPool,
  SqlWrapType,
  Value,
} from './type';

import sqlString from 'sqlstring';
import createQuery from './query';
import createRead from './read';
import createWrite from './write';
import mysqlDriverAdaper from './mysql-driver-adapter';
import TemplatedValue from './templated-value';

export type SqlWrap = {|
  build: *,
  connection: *,
  delete: *,
  encodeCursor: *,
  escape: *,
  escapeId: *,
  insert: *,
  one: *,
  query: *,
  queryStream: *,
  release: *,
  replace: *,
  save: *,
  select: *,
  selectOne: *,
  selectStream: *,
  stream: *,
  streamTable: *,
  templatedValue: *,
  update: *,
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
    build: () => query.build(),
    connection: () =>
      query
        .getConnection()
        .then(conn => createSqlWrap({ driver: conn, sqlType })),
    delete: (...args: *) => write.delete(...args),
    encodeCursor: (...args: *) => query.encodeCursor(...args),
    escape: (...args: *) => sqlString.escape(...args),
    escapeId: (...args: *) => sqlString.escapeId(...args),
    insert: (...args: *) => write.insert(...args),
    one: (...args: *) => query.row(...args),
    query: (...args: *) => query.rows(...args),
    queryStream: (...args: *) => query.stream(...args),
    release: () => {
      if (driver.release && typeof driver.release === 'function') {
        driver.release();
      } else {
        throw new TypeError('release is not a function');
      }
    },
    replace: (...args: *) => write.replace(...args),
    save: (...args: *) => write.save(...args),
    select: (...args: *) => read.select(...args),
    selectOne: (...args: *) => read.selectOne(...args),
    selectStream: (...args: *) => read.stream(...args),
    stream: (...args: *) => query.stream(...args),
    streamTable: (...args: *) => read.stream(...args),
    templatedValue,
    update: (...args: *) => write.update(...args),
  };

  return self;
};

createSqlWrap.templatedValue = templatedValue;

createSqlWrap.mysqlDriverAdaper = mysqlDriverAdaper;

module.exports = createSqlWrap;
