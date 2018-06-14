// @flow

import type { Readable } from 'stream';

export type Value = number | boolean | string | null | Date;
export type Row = { [string]: Value | { [string]: Value } };
// export type Row = Object;
export type Where = {| [string]: Value |};

export type SqlWrapType = 'mysql';

type SqlWrapQuery = ({
  sql: string,
  nestTables?: boolean,
  values?: Array<Value>,
}) => Promise<
  | Array<Row>
  | {|
      bulkWriteKey?: string,
      fieldCount: number,
      affectedRows: number,
      insertId: number,
      serverStatus: number,
      warningCount: number,
      message: string,
      changedRows: number,
    |}
>;

type SqlWrapStream = ({
  sql: string,
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
