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

import Promise from 'bluebird';
import _ from 'lodash';
import createQuery from './query';
import squel from 'squel';
import wrapUptick from './wrap-uptick';

const resolveConfig = (
  tableOrConfig: string | SqlWrapSelectConfig,
  where?: Object
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
    maybeWhere?: Object
  ): Promise<
    Array<Object> | { results: Array<Object>, resultCount: number }
  > => {
    const { table, fields, paginate, where } = resolveConfig(
      tableOrConfig,
      maybeWhere
    );
    const q = query.build().select().from(wrapUptick(table));
    if (where) {
      _.each(where, (v, k) => {
        q.where(`${wrapUptick(k)} = ?`, v);
      });
    }
    if (fields) {
      _.each(fields, f => {
        q.field(f);
      });
    }
    const response: any = q.run({ paginate });
    return response;
  };

  self.selectOne = (
    tableOrConfig: string | SqlWrapSelectConfig,
    maybeWhere?: Object
  ): Promise<Object> =>
    self.select(tableOrConfig, maybeWhere).then(resp => {
      const response: any = Array.isArray(resp)
        ? _.first(resp)
        : _.first(resp.results);
      return response;
    });

  return self;
};
