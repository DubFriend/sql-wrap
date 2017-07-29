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

import type { Readable } from 'stream';

import Promise from 'bluebird';
import _ from 'lodash';
import squelUnflavored from 'squel';

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
  driver,
  sqlType,
}: {
  driver: SqlWrapConnectionPool | SqlWrapConnection,
  sqlType: SqlWrapType,
}) => {
  const squel = squelUnflavored.useFlavour(sqlType);
  const self = {};

  const getConnection = (): Promise<SqlWrapConnection> => {
    const connectionPromise: any =
      typeof driver.getConnection === 'function'
        ? driver.getConnection()
        : Promise.resolve(driver);

    return connectionPromise;
  };

  const connectionDone = (
    connection: SqlWrapConnectionPool | SqlWrapConnection
  ): void => {
    if (typeof connection.release === 'function') {
      connection.release();
    }
  };

  const stripLimit = sql => sql.replace(/ LIMIT .*/i, '');

  const runCursor = (q, fig) => {
    const orderBy = mapOrderBy(fig.orderBy);
    const isAscending = fig.last && !fig.first ? false : true;

    const decodeCursor = c =>
      _.map(
        new Buffer(c, 'base64').toString('ascii').split(CURSOR_DELIMETER),
        (v, i) => orderBy[i].deserialize(v)
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

        return { sqls, mappedValues };
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

    const { text, values } = q.toParam();

    return self
      .rows({
        sql: text,
        values,
        resultCount: true,
      })
      .then(resp => {
        if (
          typeof resp.results === 'object' &&
          Array.isArray(resp.results) &&
          typeof resp.resultCount === 'number'
        ) {
          const r = {};
          r.resultCount = resp.resultCount;
          if (isAscending && fig.last && fig.last < resp.results.length) {
            r.results = resp.results.slice(
              resp.results.length - fig.last,
              resp.results.length
            );
          } else if (
            !isAscending &&
            fig.last &&
            fig.last < resp.results.length
          ) {
            r.results = resp.results.slice(0, fig.last);
          } else {
            r.results = resp.results;
          }

          if (!isAscending) {
            r.results = resp.results.reverse();
          }
          return r;
        } else {
          return Promise.reject(new Error("this shouldn't happen"));
        }
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

  const addCalcFoundRows = sql => {
    const pieces = sql.split(' ');
    pieces.splice(1, 0, 'SQL_CALC_FOUND_ROWS');
    return pieces.join(' ');
  };

  self.stream = (
    textOrConfig: string | SqlWrapQueryConfig,
    maybeValues?: SqlWrapInputValues
  ): Readable => driver.stream(resolveRowsConfig(textOrConfig, maybeValues));

  self.rows = (
    textOrConfig: string | SqlWrapQueryConfig,
    maybeValues?: SqlWrapInputValues
  ): Promise<
    | SqlWrapQueryWriteOutput
    | Array<Object>
    | {
      results: Array<Object>,
      resultCount: number,
    }
  > => {
    const {
      sql,
      nestTables,
      paginate,
      resultCount,
      values,
    } = resolveRowsConfig(textOrConfig, maybeValues);

    if (typeof paginate === 'object') {
      const { page = 1, resultsPerPage = 10 } = paginate;
      return getConnection().then(conn => {
        return conn
          .query({
            sql: `${stripLimit(addCalcFoundRows(sql))} LIMIT ${resultsPerPage +
              (page > 1 ? ` OFFSET ${(page - 1) * resultsPerPage}` : '')}`,
            nestTables,
            values,
          })
          .then(rows =>
            conn
              .query({ sql: 'SELECT FOUND_ROWS() AS count' })
              .then(([{ count }]) => {
                connectionDone(conn);
                const resp: any = {
                  resultCount: Number(count),
                  results: rows,
                  pageCount: Math.ceil(Number(count) / resultsPerPage),
                  currentPage: page,
                };
                return resp;
              })
              .catch(err => {
                connectionDone(conn);
                return Promise.reject(err);
              })
          );
      });
    } else if (resultCount === true) {
      return getConnection().then(conn => {
        return conn
          .query({ sql: addCalcFoundRows(sql), nestTables, values })
          .then(rows =>
            conn
              .query({ sql: 'SELECT FOUND_ROWS() AS count' })
              .then(([{ count }]) => {
                connectionDone(conn);
                const resp: any = {
                  resultCount: Number(count),
                  results: rows,
                };
                return resp;
              })
              .catch(err => {
                connectionDone(conn);
                return Promise.reject(err);
              })
          );
      });
    } else {
      return driver.query({ sql, nestTables, values });
    }
  };

  self.row = (
    textOrConfig: string | SqlWrapQueryConfig,
    maybeValues?: SqlWrapInputValues
  ): Promise<SqlWrapQueryWriteOutput | Object> => {
    const config = resolveRowsConfig(textOrConfig, maybeValues);
    config.sql = `${stripLimit(config.sql)} LIMIT 1`;
    return self
      .rows(textOrConfig, maybeValues)
      .then(resp => (Array.isArray(resp) ? _.first(resp) : resp));
  };

  self.build = (): SqlWrapQueryBuilder => {
    const wrap = method => () => {
      const s = squel[method]();

      s.run = (fig = {}) => {
        if (fig.cursor) {
          return runCursor(s, fig.cursor);
        } else {
          const { text, values } = s.toParam();
          return self.rows(_.extend({ sql: text, values }, fig));
        }
      };

      s.one = (fig = {}) => {
        const { text, values } = s.toParam();
        return self.row(_.extend({ sql: text, values }, fig));
      };

      s.whereIfDefined = (sql, value) => {
        if (value !== undefined) {
          s.where(sql, value);
        }
        return s;
      };

      return s;
    };

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
