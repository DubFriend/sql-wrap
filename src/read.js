// @flow
import type {
  SqlWrapType,
  SqlWrapConnection,
  SqlWrapConnectionPool,
  Where,
  Row,
} from './type';

type SelectConfig = {|
  table: string,
  fields?: Array<string>,
  nestTables?: boolean,
  where?: Where | Array<Where>,
|};

import type { Readable } from 'stream';
import createQuery from './query';
import sqlstring from 'sqlstring';

const resolveConfig = (
  tableOrConfig: string | SelectConfig,
  where?: Where | Array<Where>
): SelectConfig => {
  const resolved = {};
  if (typeof tableOrConfig === 'string') {
    resolved.table = tableOrConfig;
  } else {
    resolved.table = tableOrConfig.table;
    resolved.fields = tableOrConfig.fields;
    resolved.where = tableOrConfig.where;
  }
  if (where) {
    resolved.where = where;
  }
  return { ...resolved };
};

module.exports = ({
  driver,
  sqlType,
}: {
  driver: SqlWrapConnectionPool | SqlWrapConnection,
  sqlType: SqlWrapType,
}) => {
  const self = {};

  const query = createQuery({ driver, sqlType });

  self.select = (
    tableOrConfig: string | SelectConfig,
    maybeWhere?: Where | Array<Where>
  ): Promise<Array<Row>> => {
    const { table, fields, nestTables, where } = resolveConfig(
      tableOrConfig,
      maybeWhere
    );
    const q = query
      .build()
      .select()
      .from(sqlstring.escapeId(table));
    if (where) {
      q.whereIn(Array.isArray(where) ? where : [where]);
    }
    if (fields) {
      q.fields(fields);
    }
    return q.run({ nestTables });
  };

  self.stream = (
    tableOrConfig: string | SelectConfig,
    maybeWhere?: Where | Array<Where>
  ): Readable => {
    const { table, fields, nestTables, where } = resolveConfig(
      tableOrConfig,
      maybeWhere
    );
    const q = query
      .build()
      .select()
      .from(sqlstring.escapeId(table));
    if (where) {
      q.whereIn(Array.isArray(where) ? where : [where]);
    }
    if (fields) {
      q.fields(fields);
    }
    return q.stream({ nestTables });
  };

  self.selectOne = (
    tableOrConfig: string | SelectConfig,
    maybeWhere?: Where | Array<Where>
  ): Promise<Row | null> =>
    self.select(tableOrConfig, maybeWhere).then(resp => resp[0]);

  return self;
};
