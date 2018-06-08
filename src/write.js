// @flow
import type {
  SqlWrapType,
  SqlWrapConnection,
  SqlWrapConnectionPool,
  SqlWrapQueryWriteOutput,
} from './type';
import _ from 'lodash';
import createQuery from './query';
import sqlstring from 'sqlstring';
import TemplatedValue from './templated-value';

module.exports = ({
  driver,
  sqlType,
}: {
  driver: SqlWrapConnectionPool | SqlWrapConnection,
  sqlType: SqlWrapType,
}) => {
  const self = {};

  const query = createQuery({ driver, sqlType });

  const prepareWriteData = d =>
    Array.isArray(d)
      ? _.map(d, prepareWriteData)
      : d &&
        _
          .chain(d)
          .omitBy(_.isUndefined)
          .mapKeys((v, k) => sqlstring.escapeId(k))
          .value();

  const reduceRowsIntoPlaceholdersAndValues = ({
    columns,
    rows,
  }: {|
    columns?: Array<string>,
    rows: Array<Object>,
  |}) =>
    _.reduce(
      rows,
      ({ placeholders, values }, row) => {
        const rowOfPlaceholders = [];

        if (columns) {
          _.each(columns, k => {
            const v = row[k];
            if (v instanceof TemplatedValue) {
              rowOfPlaceholders.push(v.template);
              values = values.concat(v.arguments);
            } else {
              rowOfPlaceholders.push('?');
              values.push(v);
            }
          });
        } else {
          _.each(row, v => {
            if (v instanceof TemplatedValue) {
              rowOfPlaceholders.push(v.template);
              values = values.concat(v.arguments);
            } else {
              rowOfPlaceholders.push('?');
              values.push(v);
            }
          });
        }

        placeholders.push(rowOfPlaceholders);
        return { placeholders, values };
      },
      { placeholders: [], values: [] }
    );

  const buildWriteQuery = ({ operation, table, rows }) => {
    const columns = _
      .chain(rows)
      .first()
      .keys()
      .value();
    const { placeholders, values } = reduceRowsIntoPlaceholdersAndValues({
      columns,
      rows,
    });
    return {
      text: `${operation} INTO ${sqlstring.escapeId(table)} (${_
        .map(columns, c => c)
        .join(', ')}) VALUES ${_
        .map(placeholders, row => `(${row.join(', ')})`)
        .join(', ')}`,
      values,
    };
  };

  const keyByColumns = (fig: *): string =>
    _
      .chain(fig)
      .map((v, k) => k)
      .sort()
      .join(':');

  self.insert = (
    table: string,
    rowOrRows: Array<Object> | Object
  ): Promise<Array<SqlWrapQueryWriteOutput> | SqlWrapQueryWriteOutput> => {
    const rows = prepareWriteData(
      Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows]
    );

    if (rows && rows.length) {
      const grouped = {};
      _.each(rows, r => {
        const key = keyByColumns(r);
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(r);
      });

      return Promise.all(
        _.map(grouped, (rows, key) => {
          const { text, values } = buildWriteQuery({
            operation: 'INSERT',
            table,
            rows,
          });
          return query
            .rows(text, values)
            .then((resp: any) => _.extend(resp, { bulkWriteKey: key }));
        })
      ).then(resp => (Array.isArray(rowOrRows) ? resp : _.first(resp)));
    } else {
      return Promise.resolve([]);
    }
  };

  self.replace = (
    table: string,
    rowOrRows: Array<Object> | Object
  ): Promise<Array<SqlWrapQueryWriteOutput> | SqlWrapQueryWriteOutput> => {
    const rows = prepareWriteData(
      Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows]
    );

    if (rows && rows.length) {
      const grouped = {};
      _.each(rows, r => {
        const key = keyByColumns(r);
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(r);
      });

      return Promise.all(
        _.map(grouped, (rows, key) => {
          const { text, values } = buildWriteQuery({
            operation: 'REPLACE',
            table,
            rows,
          });
          return query
            .rows(text, values)
            .then((resp: any) => _.extend(resp, { bulkWriteKey: key }));
        })
      ).then(resp => (Array.isArray(rowOrRows) ? resp : _.first(resp)));
    } else {
      return Promise.resolve([]);
    }
  };

  type UpdateWhere = Object;
  type UpdateObject = { update: Object, where: UpdateWhere };
  self.update = (
    table: string,
    updateOrUpdates: Object | Array<UpdateObject>,
    where?: UpdateWhere
  ): Promise<*> => {
    const updates = Array.isArray(updateOrUpdates)
      ? _.map(updateOrUpdates, ({ update, where }) => ({
          update: prepareWriteData(update),
          where: prepareWriteData(where),
        }))
      : [
          {
            update: prepareWriteData(updateOrUpdates),
            where: prepareWriteData(where),
          },
        ];

    if (!updates.length) {
      return Promise.resolve();
    }

    const buildUpdateQuery = ({
      table,
      update,
    }: {
      table: string,
      update: UpdateObject,
    }) => {
      const { values } = reduceRowsIntoPlaceholdersAndValues({
        rows: [update.update].concat(update.where),
      });

      return {
        text: `UPDATE ${sqlstring.escapeId(table)} SET ${_
          .map(
            update.update,
            (v, k) => `${k} = ${v instanceof TemplatedValue ? v.template : '?'}`
          )
          .join(', ')} ${update.where ? 'WHERE' : ''} ${_
          .map(
            update.where,
            (v, k: string) =>
              `${k} ${Array.isArray(v) ? 'IN' : '='} (${
                v instanceof TemplatedValue ? v.template : '?'
              })`
          )
          .join(' AND ')}`,
        values,
      };
    };

    const queries = _.map(updates, (update: any) =>
      buildUpdateQuery({ table, update })
    );

    return driver.query({
      sql: _.map(queries, ({ text }) => text).join(';\n'),
      values: _
        .chain(queries)
        .map(({ values }) => values)
        .flatten()
        .value(),
    });
  };

  self.delete = (
    table: string,
    where?: Object | Array<Object>
  ): Promise<SqlWrapQueryWriteOutput | void> => {
    if (Array.isArray(where) && !where.length) {
      return Promise.resolve();
    }

    const q = query
      .build()
      .delete()
      .from(sqlstring.escapeId(table));
    if (where) {
      q.whereIn(Array.isArray(where) ? where : [where]);
    }
    const response: any = q.run();
    return response;
  };

  self.save = (
    table: string,
    rowOrRows: Array<Object> | Object
  ): Promise<Array<SqlWrapQueryWriteOutput> | SqlWrapQueryWriteOutput> => {
    const rows = prepareWriteData(
      Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows]
    );

    if (rows && rows.length) {
      const grouped = {};
      _.each(rows, r => {
        const key = keyByColumns(r);
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(r);
      });

      return Promise.all(
        _.map(grouped, (rows, key) => {
          const wqResp = buildWriteQuery({
            operation: 'INSERT',
            table,
            rows,
          });
          let text = wqResp.text;
          const values = wqResp.values;

          text += ` ON DUPLICATE KEY UPDATE ${_
            .map(_.first(rows), (v, k) => `${k} = VALUES(${k})`)
            .join(', ')}`;

          return query
            .rows(text, values)
            .then((resp: any) => _.extend(resp, { bulkWriteKey: key }));
        })
      ).then(resp => (Array.isArray(rowOrRows) ? resp : _.first(resp)));
    } else {
      return Promise.resolve([]);
    }
  };

  return self;
};
