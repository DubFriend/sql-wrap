// @flow

import type Promise from 'bluebird';

export type SqlWrapType = 'mysql';

export type SqlWrapOrderByDirection = 'ASC' | 'DESC';

export type SqlWrapSerializeField = (fieldToDB: mixed) => mixed;
export type SqlWrapDeserializeField = (fieldFromDB: mixed) => mixed;

export type SqlWrapOrderByObject = {
  field: string,
  direction: SqlWrapOrderByDirection,
  serialize?: SqlWrapSerializeField,
  deserialize?: SqlWrapDeserializeField,
};

export type SqlWrapMappedOrderByObject = {
  field: string,
  isAscending: boolean,
  serialize: SqlWrapSerializeField,
  deserialize: SqlWrapDeserializeField,
};

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
  page?: number,
  resultsPerPage?: number,
};

export type SqlWrapCursor = {
  first?: number,
  last?: number,
  before?: string,
  after?: string,
  orderBy: string | SqlWrapOrderByObject | Array<string | SqlWrapOrderByObject>,
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

export type SqlWrapQueryBuilder = {|
  select: () => SqlWrapQueryBuilder,
  update: () => SqlWrapQueryBuilder,
  delete: () => SqlWrapQueryBuilder,
  insert: () => SqlWrapQueryBuilder,
  from: (table: string, tableNickName?: string) => SqlWrapQueryBuilder,
  where: (statement: string, value?: mixed) => SqlWrapQueryBuilder,
  whereIfDefined: (statement: string, value?: mixed) => SqlWrapQueryBuilder,
  set: (
    field: string,
    value: mixed,
    opt?: { dontQuote?: boolean }
  ) => SqlWrapQueryBuilder,
  field: (statement: string, label?: string) => SqlWrapQueryBuilder,
  group: (field: string) => SqlWrapQueryBuilder,
  join: (
    table: string,
    tableLabel: string,
    joinWhere: string
  ) => SqlWrapQueryBuilder,
  left_join: (
    table: string,
    tableLabel: string,
    joinWhere: string
  ) => SqlWrapQueryBuilder,
  run: (fig?: {|
    nestTables?: boolean,
    paginate?: SqlWrapPagination,
    cursor?: SqlWrapCursor,
  |}) => Promise<Array<Object> | SqlWrapQueryWriteOutput>,
  one: (fig?: {|
    nestTables?: boolean,
    paginate?: SqlWrapPagination,
    cursor?: SqlWrapCursor,
  |}) => Promise<Object | SqlWrapQueryWriteOutput>,
  toParam: () => { text: string, values: Array<*> },
|};
