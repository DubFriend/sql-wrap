// @flow
import type {
  SqlWrapType,
  SqlWrapConnection,
  SqlWrapConnectionPool,
  SqlWrapSelectConfig,
} from './type';
import type { Readable } from 'stream';
import createQuery from './query';
import sqlstring from 'sqlstring';

const resolveConfig = (
  tableOrConfig: string | SqlWrapSelectConfig,
  where?: Object | Array<Object>
): SqlWrapSelectConfig => {
  const resolved = {};
  if (typeof tableOrConfig === 'string') {
    resolved.table = tableOrConfig;
  } else {
    resolved.table = tableOrConfig.table;
    resolved.fields = tableOrConfig.fields;
    resolved.paginate = tableOrConfig.paginate;
    resolved.where = tableOrConfig.where;
  }

  if (where) {
    resolved.where = where;
  }

  return resolved;
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
    tableOrConfig: string | SqlWrapSelectConfig,
    maybeWhere?: Object | Array<Object>
  ): Promise<
    Array<Object> | { results: Array<Object>, resultCount: number }
  > => {
    const { table, fields, nestTables, paginate, where } = resolveConfig(
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
      fields.forEach(f => {
        q.field(f);
      });
    }
    const response: any = q.run({ paginate, nestTables });
    return response;
  };

  self.stream = (
    tableOrConfig: string | SqlWrapSelectConfig,
    maybeWhere?: Object | Array<Object>
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
      fields.forEach(f => {
        q.field(f);
      });
    }
    return q.stream({ nestTables });
  };

  self.selectOne = (
    tableOrConfig: string | SqlWrapSelectConfig,
    maybeWhere?: Object | Array<Object>
  ): Promise<Object | null> =>
    self.select(tableOrConfig, maybeWhere).then(resp => {
      const response: any = Array.isArray(resp) ? resp[0] : resp.results[0];
      return response || null;
    });

  return self;
};
