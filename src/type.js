// @flow
import type { Readable } from 'stream';

export type Value = number | boolean | string | null | Date;
export type Row = Object;
export type Where = {};

export type SqlWrapType = 'mysql';

type SqlWrapQuery = ({
  text: string,
  nestTables?: boolean,
  values?: Array<Value>,
}) => Promise<
  Array<Row> | {| changedRows?: number |} | {| insertId?: number |}
>;

type SqlWrapStream = ({
  text: string,
  nestTables?: boolean,
  values?: Array<Value>,
}) => Readable;

export type SqlWrapConnection = {
  query: SqlWrapQuery,
  stream: SqlWrapStream,
  release: () => void,
};

export type SqlWrapConnectionPool = {
  query: SqlWrapQuery,
  stream: SqlWrapStream,
  getConnection: () => Promise<SqlWrapConnection>,
};
