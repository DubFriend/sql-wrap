// @flow

import type {
  SqlWrapQuery,
  SqlWrapConnection,
  SqlWrapConnectionPool,
  SqlWrapInputValues,
  SqlWrapPagination,
  SqlWrapQueryConfig,
  SqlWrapQueryStreamConfig,
  SqlWrapSelectConfig,
  SqlWrapSelectStreamConfig,
  SqlWrapType,
  SqlWrapQueryWriteOutput,
} from './type';

import squel from 'squel';
import Promise from 'bluebird';
import _ from 'lodash';
import sqlString from 'sqlstring';
import createQuery from './query';
import createRead from './read';
import createWrite from './write';

const createSqlWrap = ({
  driver,
  sqlType,
}: {
  driver: SqlWrapConnectionPool | SqlWrapConnection,
  sqlType: SqlWrapType,
}) => {
  const self = {};

  const query = createQuery({ driver, sqlType });
  const read = createRead({ driver, sqlType });
  const write = createWrite({ driver, sqlType });

  self.connection = (): Promise<*> =>
    query
      .getConnection()
      .then(conn => createSqlWrap({ driver: conn, sqlType }));

  self.release = (): void => {
    if (driver.release && typeof driver.release === 'function') {
      driver.release();
    } else {
      throw new TypeError('release is not a function');
    }
  };

  self.query = (textOrConfig: *, values?: *): * =>
    query.rows(textOrConfig, values);

  self.one = self.queryStream = (textOrConfig: *, values?: *): * =>
    query.row(textOrConfig, values);

  self.select = (textOrConfig: *, where?: *) =>
    read.select(textOrConfig, where);

  self.selectOne = (textOrConfig: *, where?: *) =>
    read.selectOne(textOrConfig, where);

  self.stream = (textOrConfig: *, where?: *): * =>
    query.stream(textOrConfig, where);

  self.streamTable = (textOrConfig: *, where?: *): * =>
    read.stream(textOrConfig, where);

  self.queryStream = (textOrConfig: *, where?: *): * =>
    Promise.resolve(query.stream(textOrConfig, where));

  self.selectStream = (textOrConfig: *, where?: *): * =>
    Promise.resolve(read.stream(textOrConfig, where));

  self.insert = (table: *, rowOrRows: *): * => write.insert(table, rowOrRows);

  self.replace = (table: *, rowOrRows: *): * => write.replace(table, rowOrRows);

  self.save = (table: *, rowOrRows: *) => write.save(table, rowOrRows);

  self.update = (table: *, rowOrRows: *, where?: *): * =>
    write.update(table, rowOrRows, where);

  self.delete = (table: *, where?: *): * => write.delete(table, where);

  self.build = (): * => query.build();

  self.escape = (data: mixed): mixed => sqlString.escape(data);
  self.escapeId = (data: string): string => sqlString.escapeId(data);

  self.encodeCursor = (orderBy: *, row: *): * =>
    query.encodeCursor(orderBy, row);

  return self;
};

module.exports = createSqlWrap;
