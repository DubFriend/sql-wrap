// @flow

import type {
  SqlWrapType,
  SqlWrapConnection,
  SqlWrapConnectionPool,
  Row,
  Value,
  Where,
} from './type';

import type { Readable } from 'stream';
import _ from 'lodash';
import squelUnflavored from 'squel';
import sqlstring from 'sqlstring';

type MappedOrderByObject = {
  field: string,
  isAscending: boolean,
  serialize: (fieldToDB: mixed) => mixed,
  deserialize: (fieldToDB: mixed) => mixed,
};

type OrderByDirection = 'ASC' | 'DESC';

type OrderByConfig = {
  field: string,
  direction?: OrderByDirection,
  serialize?: (fieldToDB: mixed) => mixed,
  deserialize?: (fieldToDB: mixed) => mixed,
};

type Pagination = {| page?: number, resultsPerPage?: number |};

type QueryConfig = {
  sql: string,
  nestTables?: boolean,
  paginate?: Pagination,
  resultCount?: boolean,
  values?: Array<Value>,
};

type SelectBuilder = {|
  field: (
    name: string,
    alias?: string,
    options?: {| ignorePeriodsForFieldNameQuotes?: boolean |}
  ) => SelectBuilder,
  fields: (
    { [string]: string } | Array<string>,
    options?: {| ignorePeriodsForFieldNameQuotes?: boolean |}
  ) => SelectBuilder,
  from: (table: string, alias?: string) => SelectBuilder,
  join: (
    table: string,
    aliasOrCondition?: string,
    condition?: string
  ) => SelectBuilder,
  leftJoin: (
    table: string,
    aliasOrCondition?: string,
    condition?: string
  ) => SelectBuilder,
  rightJoin: (
    table: string,
    aliasOrCondition?: string,
    condition?: string
  ) => SelectBuilder,
  outerJoin: (
    table: string,
    aliasOrCondition?: string,
    condition?: string
  ) => SelectBuilder,
  crossJoin: (
    table: string,
    aliasOrCondition?: string,
    condition?: string
  ) => SelectBuilder,
  where: (condition: string, ...args: Array<Value>) => SelectBuilder,
  whereIn: (where: Array<Where>) => SelectBuilder,
  order: (
    field: string,
    direction?: OrderByDirection,
    ...args: Array<Value>
  ) => SelectBuilder,
  group: (field: string) => SelectBuilder,
  having: (condition: string, ...args: Array<Value>) => SelectBuilder,
  limit: number => SelectBuilder,
  offset: number => SelectBuilder,
  toString: void => string,
  toParam: void => {| text: string, values: Array<Value> |},
  run: (?{| nestTables?: boolean |}) => Promise<Array<Row>>,
  one: (?{| nestTables?: boolean |}) => Promise<Row | null>,
  runRowCount: (
    ?{| nestTables?: boolean |}
  ) => Promise<{| results: Array<Row>, resultCount: number |}>,
  runPaginate: (
    ?{| nestTables?: boolean, page?: number, resultsPerPage?: number |}
  ) => Promise<{|
    results: Array<Row>,
    resultCount: number,
    pageCount: number,
    currentPage: number,
  |}>,
  runCursor: (
    ?{|
      nestTables?: boolean,
      first?: number,
      last?: number,
      before?: string,
      after?: string,
      orderBy: string | OrderByConfig | Array<string | OrderByConfig>,
    |}
  ) => Promise<{|
    resultCount: number,
    pageInfo: {|
      hasPreviousPage: boolean,
      hasNextPage: boolean,
      startCursor: string,
      endCursor: string,
    |},
    edges: Array<{| node: Row, cursor: string |}>,
  |}>,
  stream: (?{| nestTables?: boolean |}) => Readable,
|};

type UpdateBuilder = {|
  table: (name: string, alias?: string) => UpdateBuilder,
  set: (
    name: string,
    value: Value,
    options?: {|
      ignorePeriodsForFieldNameQuotes?: boolean,
      dontQuote?: boolean,
    |}
  ) => UpdateBuilder,
  setFields: (
    fields: {| [string]: Value |},
    options?: {| ignorePeriodsForFieldNameQuotes: boolean |}
  ) => UpdateBuilder,
  where: (statement: string, ...args?: Array<Value>) => UpdateBuilder,
  whereIn: (where: Array<Where>) => UpdateBuilder,
  limit: number => UpdateBuilder,
  offeset: number => UpdateBuilder,
  toString: void => string,
  toParam: void => {| text: string, values: Array<Value> |},
  run: void => Promise<{ changedRows?: number }>,
|};

type DeleteBuilder = {|
  from: (table: string, alias?: string) => DeleteBuilder,
  where: (condition: string, ...args?: Array<Value>) => DeleteBuilder,
  whereIn: (where: Array<Where>) => DeleteBuilder,
  limit: number => DeleteBuilder,
  offset: number => DeleteBuilder,
  toString: void => string,
  toParam: void => {| text: string, values: Array<Value> |},
  run: void => Promise<{ changedRows?: number }>,
|};

type InsertBuilder = {|
  into: (table: string) => InsertBuilder,
  set: (
    field: string,
    value: Value,
    options?: {|
      ignorePeriodsForFieldNameQuotes?: boolean,
      dontQuote?: boolean,
    |}
  ) => InsertBuilder,
  setFields: (
    fields: {| [string]: Value |},
    options?: {| ignorePeriodsForFieldNameQuotes?: boolean |}
  ) => InsertBuilder,
  setFieldsRows: (
    fields: Array<{| [string]: Value |}>,
    options?: {| ignorePeriodsForFieldNameQuotes?: boolean |}
  ) => InsertBuilder,
  fromQuery: (columns: Array<string>, query: SelectBuilder) => InsertBuilder,
  onDupUpdate: (
    name: string,
    value: Value,
    options?: {|
      ignorePeriodsForFieldNameQuotes?: boolean,
      dontQuote?: boolean,
    |}
  ) => InsertBuilder,
  toString: void => string,
  toParam: void => {| text: string, values: Array<Value> |},
  run: void => Promise<{ insertId?: number }>,
|};

type ReplaceBuilder = {|
  into: (table: string) => InsertBuilder,
  set: (
    field: string,
    value: Value,
    options?: {|
      ignorePeriodsForFieldNameQuotes?: boolean,
      dontQuote?: boolean,
    |}
  ) => InsertBuilder,
  setFields: (
    fields: {| [string]: Value |},
    options?: {| ignorePeriodsForFieldNameQuotes?: boolean |}
  ) => InsertBuilder,
  setFieldsRows: (
    fields: Array<{| [string]: Value |}>,
    options?: {| ignorePeriodsForFieldNameQuotes?: boolean |}
  ) => InsertBuilder,
  fromQuery: (columns: Array<string>, query: SelectBuilder) => InsertBuilder,
  toString: void => string,
  toParam: void => {| text: string, values: Array<Value> |},
  run: void => Promise<void>,
|};

export type SqlWrapQueryBuilder = {|
  select: void => SelectBuilder,
  update: void => UpdateBuilder,
  delete: void => DeleteBuilder,
  insert: void => InsertBuilder,
  replace: void => ReplaceBuilder,
|};

const CURSOR_DELIMETER = '#';

const mapOrderBy = (
  raw: string | OrderByConfig | Array<string | OrderByConfig>
): Array<MappedOrderByObject> =>
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
        : _
            .chain(o)
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
  textOrConfig: string | QueryConfig,
  values?: Array<Value>
): QueryConfig => {
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
  squel.registerValueHandler(Date, d => d);

  const self = {};

  self.getConnection = (): Promise<SqlWrapConnection> => {
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

  const encodeCursor = (
    orderBy: Array<MappedOrderByObject>,
    row: Object
  ): string =>
    new Buffer(
      _
        .map(
          orderBy,
          o => (o.serialize ? o.serialize(row[o.field]) : String(row[o.field]))
        )
        .join(CURSOR_DELIMETER)
    ).toString('base64');

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
        const sql = _
          .map(
            orderBy,
            (o, i) =>
              i === values.length - 1
                ? `${sqlstring.escapeId(o.field)} ${
                    (o.isAscending ? isGreaterThan : !isGreaterThan) ? '>' : '<'
                  } ?`
                : `${sqlstring.escapeId(o.field)} = ?`
          )
          .join(' AND ');

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
      q.where(...buildWhereArgs(decodeCursor(fig.after), true));
    }

    if (fig.before) {
      q.where(...buildWhereArgs(decodeCursor(fig.before), false));
    }

    q.limit(isAscending ? fig.first : fig.last);

    const { text, values } = q.toParam();

    return self
      .rows({ sql: text, values, resultCount: true })
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
          return Promise.reject(
            new TypeError('response is missing "results" and/or "resultCount"')
          );
        }
      })
      .then(resp => {
        const edges = _.map(resp.results, r => ({
          node: r,
          cursor: encodeCursor(orderBy, r),
        }));
        return {
          resultCount: resp.resultCount,
          pageInfo: {
            hasPreviousPage: fig.last ? resp.resultCount > fig.last : false,
            hasNextPage: fig.first ? resp.resultCount > fig.first : false,
            startCursor: (_.first(edges) && _.first(edges).cursor) || null,
            endCursor: (_.last(edges) && _.last(edges).cursor) || null,
          },
          edges,
        };
      });
  };

  self.encodeCursor = (
    orderByRaw: string | OrderByConfig | Array<string | OrderByConfig>,
    row: Object
  ): string => encodeCursor(mapOrderBy(orderByRaw), row);

  const addCalcFoundRows = sql => {
    const pieces = sql.split(' ');
    pieces.splice(1, 0, 'SQL_CALC_FOUND_ROWS');
    return pieces.join(' ');
  };

  self.stream = (
    textOrConfig: string | QueryConfig,
    maybeValues?: Array<Value>
  ): Readable => driver.stream(resolveRowsConfig(textOrConfig, maybeValues));

  self.rows = (
    textOrConfig: string | QueryConfig,
    maybeValues?: Array<Value>
  ): Promise<
    | SqlWrapQueryWriteOutput
    | Array<Object>
    | { results: Array<Object>, resultCount: number }
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
      return self.getConnection().then(conn => {
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
      return self.getConnection().then(conn => {
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
    textOrConfig: string | QueryConfig,
    maybeValues?: Array<Value>
  ): Promise<SqlWrapQueryWriteOutput | Object | null> => {
    const config = resolveRowsConfig(textOrConfig, maybeValues);
    config.sql = `${stripLimit(config.sql)} LIMIT 1`;
    return self
      .rows(textOrConfig, maybeValues)
      .then(resp => (Array.isArray(resp) ? _.first(resp) : resp))
      .then(resp => (resp === undefined ? null : resp));
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

      s.stream = (fig = {}) => {
        const { text, values } = s.toParam();
        return self.stream(_.extend({ sql: text, values }, fig));
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

      s.whereIn = wheres => {
        if (wheres.length) {
          const ors = squel.expr();
          _.each(wheres, where => {
            const ands = squel.expr();
            _.each(where, (v, k) => {
              ands.and(`${sqlstring.escapeId(k)} = ?`, v);
            });
            ors.or(ands);
          });
          s.where(ors);
        } else {
          s.where('FALSE');
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
      replace: wrap('replace'),
      case: wrap('case'),
      expr: wrap('expr'),
      cls: wrap('cls'),
    };

    return buildSelf;
  };

  return self;
};
