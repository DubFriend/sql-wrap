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
  SqlWrapQueryBuilder as _SqlWrapQueryBuilder,
  SqlWrapOrderByObject
} from "./type";

import type { Readable } from "stream";

import squel from "squel";
import Promise from "bluebird";
import _ from "lodash";
import sqlString from "sqlstring";
import createQuery from "./query";
import createRead from "./read";
import createWrite from "./write";
import mysqlDriverAdaper from "./mysql-driver-adapter";
import TemplatedValue from "./templated-value";

export type SqlWrapQueryBuilder = _SqlWrapQueryBuilder;

export type SqlWrap = {
  connection: () => Promise<*>,
  release: () => void,
  query: (
    textOrConfig: string | SqlWrapQueryConfig,
    maybeValues?: SqlWrapInputValues
  ) => Promise<
    | SqlWrapQueryWriteOutput
    | Array<Object>
    | { results: Array<Object>, resultCount: number }
  >,
  one: (
    textOrConfig: string | SqlWrapQueryConfig,
    maybeValues?: SqlWrapInputValues
  ) => Promise<SqlWrapQueryWriteOutput | Object | null>,
  select: (
    tableOrConfig: string | SqlWrapSelectConfig,
    maybeWhere?: Object
  ) => Promise<Array<Object> | { results: Array<Object>, resultCount: number }>,
  selectOne: (
    tableOrConfig: string | SqlWrapSelectConfig,
    maybeWhere?: Object
  ) => Promise<Object | null>,
  stream: (
    textOrConfig: string | SqlWrapQueryConfig,
    maybeValues?: SqlWrapInputValues
  ) => Readable,
  streamTable: (
    tableOrConfig: string | SqlWrapSelectConfig,
    maybeWhere?: Object
  ) => Readable,
  queryStream: (
    textOrConfig: string | SqlWrapQueryConfig,
    maybeValues?: SqlWrapInputValues
  ) => Promise<Readable>,
  selectStream: (
    tableOrConfig: string | SqlWrapSelectConfig,
    maybeWhere?: Object
  ) => Promise<Readable>,
  insert: (
    table: string,
    rowOrRows: Array<Object> | Object
  ) => Promise<Array<SqlWrapQueryWriteOutput> | SqlWrapQueryWriteOutput>,
  update: (
    table: string,
    updates: Object | Array<{ update: Object, where: Object | Array<Object> }>,
    where?: Object | Array<Object>
  ) => Promise<*>,
  delete: (table: string, where?: Object | Array<Object>) => Promise<*>,
  save: (
    table: string,
    rowOrRows: Array<Object> | Object
  ) => Promise<Array<SqlWrapQueryWriteOutput> | SqlWrapQueryWriteOutput>,
  replace: (
    table: string,
    rowOrRows: Array<Object> | Object
  ) => Promise<Array<SqlWrapQueryWriteOutput> | SqlWrapQueryWriteOutput>,
  build: () => _SqlWrapQueryBuilder,
  escape: () => (data: mixed) => mixed,
  escapeId: () => (data: string) => string,
  encodeCursor: (
    orderBy:
      | string
      | SqlWrapOrderByObject
      | Array<string | SqlWrapOrderByObject>,
    row: Object
  ) => string
};

const templatedValue = (template: string, ...args: Array<mixed>) =>
  new TemplatedValue(template, ...args);

const createSqlWrap = ({
  driver,
  sqlType
}: {
  driver: SqlWrapConnectionPool | SqlWrapConnection,
  sqlType: SqlWrapType
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
    if (driver.release && typeof driver.release === "function") {
      driver.release();
    } else {
      throw new TypeError("release is not a function");
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

  self.update = (table: *, rowOrRows: *, where?: *): * =>
    write.update(table, rowOrRows, where);

  self.delete = (table: *, where?: *): * => write.delete(table, where);

  self.save = (table: *, rowOrRows: *) => write.save(table, rowOrRows);

  self.replace = (table: *, rowOrRows: *): * => write.replace(table, rowOrRows);

  self.build = (): * => query.build();

  self.escape = (data: mixed): mixed => sqlString.escape(data);
  self.escapeId = (data: string): string => sqlString.escapeId(data);

  self.encodeCursor = (orderBy: *, row: *): * =>
    query.encodeCursor(orderBy, row);

  self.templatedValue = templatedValue;

  return self;
};

createSqlWrap.templatedValue = templatedValue;

createSqlWrap.mysqlDriverAdaper = mysqlDriverAdaper;

module.exports = createSqlWrap;
