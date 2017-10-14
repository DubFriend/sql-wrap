// @flow

import type {
  SqlWrapType,
  SqlWrapQuery,
  SqlWrapConnection,
  SqlWrapConnectionPool,
  SqlWrapInputValues,
  SqlWrapPagination,
  SqlWrapQueryConfig,
  SqlWrapQueryStreamConfig,
  SqlWrapSelectConfig,
  SqlWrapSelectStreamConfig,
} from './type';

import type { Readable } from 'stream';

import Promise from 'bluebird';
import _ from 'lodash';
import createQuery from './query';
import squel from 'squel';
import wrapUptick from './wrap-uptick';

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
    const q = query.build().select().from(wrapUptick(table));
    if (where) {
      q.whereIn(Array.isArray(where) ? where : [where]);
      // _.each(where, (v, k) => {
      //   q.where(`${wrapUptick(k)} = ?`, v);
      // });
    }

    if (fields) {
      _.each(fields, f => {
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
    const q = query.build().select().from(wrapUptick(table));
    if (where) {
      q.whereIn(Array.isArray(where) ? where : [where]);
      // _.each(where, (v, k) => {
      //   q.where(`${wrapUptick(k)} = ?`, v);
      // });
    }
    if (fields) {
      _.each(fields, f => {
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
      const response: any = Array.isArray(resp)
        ? _.first(resp)
        : _.first(resp.results);
      return response || null;
    });

  return self;
};
