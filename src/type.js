// @flow

import type Promise from 'bluebird';

export type SqlWrapType = 'mysql';

export type SqlWrapQueryWriteOutput = {
  fieldCount: number,
  affectedRows: number,
  insertId: number,
  serverStatus: number,
  warningCount: number,
  message: string,
  changedRows: number,
};
export type SqlWrapQuery = ({
  sql: string,
  values?: Array<mixed>,
}) => Promise<Array<Object> | SqlWrapQueryWriteOutput>;

export type SqlWrapConnection = {
  query: SqlWrapQuery,
  release: () => void,
};

export type SqlWrapConnectionPool = {
  query: SqlWrapQuery,
  getConnection: () => Promise<SqlWrapConnection>,
};

export type SqlWrapInputValues = Array<mixed>;

export type SqlWrapPagination = {
  page: number,
  resultsPerPage: number,
};

export type SqlWrapQueryConfig = {
  sql: string,
  nestTables?: boolean,
  paginate?: SqlWrapPagination,
  resultCount?: boolean,
  values?: SqlWrapInputValues,
};

export type SqlWrapQueryStreamConfig = {
  sql: string,
  nestTables?: boolean,
  values?: SqlWrapInputValues,
};

export type SqlWrapSelectConfig = {
  table: string,
  fields?: Array<string>,
  paginate?: SqlWrapPagination,
  where?: Object,
};

export type SqlWrapSelectStreamConfig = {
  table: string,
  fields?: Array<string>,
  where?: Object,
};
