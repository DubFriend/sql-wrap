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
  SqlWrapQueryWriteOutput,
  SqlWrapOrderByDirection,
  SqlWrapOrderByObject,
  SqlWrapSerializeField,
  SqlWrapDeserializeField,
  SqlWrapMappedOrderByObject,
  SqlWrapQueryBuilder,
} from './type';

import type Promise from 'bluebird';
import _ from 'lodash';
import squel from 'squel';

const CURSOR_DELIMETER = '#';

const mapOrderBy = (
  raw: string | SqlWrapOrderByObject | Array<string | SqlWrapOrderByObject>
): Array<SqlWrapMappedOrderByObject> =>
  _.map(
    Array.isArray(raw) ? raw : [raw],
    o =>
      typeof o === 'string'
        ? {
            field: o,
            isAscending: true,
            serialize: v => v,
            deserialize: v => v,
          }
        : _.chain(o)
            .omit('direction')
            .clone()
            .extend({
              isAscending: o.direction === 'DESC' ? false : true,
              serialize: o.serialize || (v => v),
              deserialize: o.deserialize || (v => v),
            })
            .value()
  );

const resolveRowsConfig = (
  textOrConfig: string | SqlWrapQueryConfig,
  values?: SqlWrapInputValues
): SqlWrapQueryConfig => {
  const config = {};

  if (typeof textOrConfig === 'string') {
    config.sql = textOrConfig;
  } else {
    config.sql = textOrConfig.sql;
    config.nestTables = textOrConfig.nestTables;
    config.paginate = textOrConfig.paginate;
    config.resultCount = textOrConfig.resultCount;
    config.values = textOrConfig.values;
  }

  if (values) {
    config.values = values;
  }

  return config;
};

module.exports = ({
  connectionPool,
}: {
  connectionPool: SqlWrapConnectionPool,
}) => {
  const self = {};

  const runCursor = (q, fig) => {
    const orderBy = mapOrderBy(fig.orderBy);
    const isAscending = fig.last && !fig.first ? false : true;

    const decodeCursor = c =>
      _.map(
        new Buffer(c, 'base64').toString('ascii').split(CURSOR_DELIMETER),
        (v, i) => (orderBy[i].deserialize ? orderBy[i].deserialize(v) : v)
      );

    const buildWhereArgs = (values, isGreaterThan) => {
      const build = (values, orderBy, isGreaterThan) => {
        const sql = _.map(
          orderBy,
          (o, i) =>
            i === values.length - 1
              ? `${o.field} ${(o.isAscending ? isGreaterThan : !isGreaterThan)
                  ? '>'
                  : '<'} ?`
              : `${o.field} = ?`
        ).join(' AND ');

        let sqls = [sql];
        let mappedValues = [values];

        if (values.length > 1) {
          const w = build(_.initial(values), _.initial(orderBy), isGreaterThan);
          sqls = sqls.concat(w.sqls);
          mappedValues = mappedValues.concat(w.mappedValues);
        }

        return {
          sqls: sqls,
          mappedValues: mappedValues,
        };
      };

      const w = build(values, orderBy, isGreaterThan);

      return [w.sqls.reverse().join(' OR ')].concat(
        _.flatten(w.mappedValues.reverse())
      );
    };

    _.each(orderBy, o => {
      q.order(o.field, o.isAscending ? isAscending : !isAscending);
    });

    if (fig.after) {
      q.where.apply(q, buildWhereArgs(decodeCursor(fig.after), true));
    }

    if (fig.before) {
      q.where.apply(q, buildWhereArgs(decodeCursor(fig.before), false));
    }

    q.limit(isAscending ? fig.first : fig.last);

    const query = q.toParam();

    return self
      .query(
        {
          sql: query.text,
          resultCount: true,
        },
        query.values
      )
      .then(resp => {
        if (isAscending && fig.last && fig.last < resp.results.length) {
          resp.results = resp.results.slice(
            resp.results.length - fig.last,
            resp.results.length
          );
        } else if (!isAscending && fig.last && fig.last < resp.results.length) {
          resp.results = resp.results.slice(0, fig.last);
        }

        if (!isAscending) {
          resp.results = resp.results.reverse();
        }

        return resp;
      })
      .then(resp => ({
        resultCount: resp.resultCount,
        pageInfo: {
          hasPreviousPage: fig.last ? resp.resultCount > fig.last : false,
          hasNextPage: fig.first ? resp.resultCount > fig.first : false,
        },
        edges: _.map(resp.results, r => ({
          node: r,
          cursor: encodeCursor(orderBy, r),
        })),
      }));
  };

  const encodeCursor = (
    orderBy: Array<SqlWrapMappedOrderByObject>,
    row: Object
  ): string =>
    new Buffer(
      _.map(
        orderBy,
        o => (o.serialize ? o.serialize(row[o.field]) : String(row[o.field]))
      ).join(CURSOR_DELIMETER)
    ).toString('base64');

  self.encodeCursor = (
    orderByRaw:
      | string
      | SqlWrapOrderByObject
      | Array<string | SqlWrapOrderByObject>,
    row: Object
  ): string => encodeCursor(mapOrderBy(orderByRaw), row);

  self.rows = (
    textOrConfig: string | SqlWrapQueryConfig,
    maybeValues?: SqlWrapInputValues
  ): Promise<SqlWrapQueryWriteOutput | Array<Object>> => {
    const { sql, values } = resolveRowsConfig(textOrConfig, maybeValues);
    return connectionPool.query({ sql, values });
  };

  self.build = (): SqlWrapQueryBuilder => {
    const wrap = method => () => {
      const s = squel[method]();

      s.run = fig => {
        fig = fig || {};
        if (fig.cursor) {
          return runCursor(s, fig.cursor);
        } else {
          const p = s.toParam();
          return self.query(_.extend({ sql: p.text }, fig), p.values);
        }
      };

      s.one = fig => {
        const p = s.toParam();
        return self.one(_.extend({ sql: p.text }, fig || {}), p.values);
      };

      s.whereIfDefined = (sql, value) => {
        if (value !== undefined) {
          s.where(sql, value);
        }
        return s;
      };

      return s;
    };

    // make type system happy
    const buildSelf: any = {
      select: wrap('select'),
      update: wrap('update'),
      delete: wrap('delete'),
      insert: wrap('insert'),
    };

    return buildSelf;
  };

  return self;
};
