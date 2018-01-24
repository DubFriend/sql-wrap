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
} from './type';

import Promise from 'bluebird';
import _ from 'lodash';
import createQuery from './query';
import squel from 'squel';
import wrapUptick from './wrap-uptick';
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
        _.chain(d)
          .omitBy(_.isUndefined)
          .mapKeys((v, k) => wrapUptick(k))
          .value();

  const reduceRowsIntoPlaceholdersAndValues = rows =>
    _.reduce(
      rows,
      ({ placeholders, values }, row) => {
        const rowOfPlaceholders = [];
        _.each(row, (v, k) => {
          if (v instanceof TemplatedValue) {
            rowOfPlaceholders.push(v.template);
            values = values.concat(v.arguments);
          } else {
            rowOfPlaceholders.push('?');
            values.push(v);
          }
        });

        placeholders.push(rowOfPlaceholders);
        return { placeholders, values };
      },
      { placeholders: [], values: [] }
    );

  const buildInsertQuery = ({ operation = 'INSERT', table, rows }) => {
    const { placeholders, values } = reduceRowsIntoPlaceholdersAndValues(rows);
    return {
      text: `${operation} INTO ${wrapUptick(table)} (${_.chain(rows)
        .first()
        .keys()
        .value()}) VALUES ${_.map(
        placeholders,
        row => `(${row.join(', ')})`
      ).join(', ')}`,
      values,
    };
  };

  const keyByColumns = (fig: Object): string =>
    _.chain(fig).map((v, k) => k).sort().join(':');

  self.insert = (
    table: string,
    rowOrRows: Array<Object> | Object
  ): Promise<Array<SqlWrapQueryWriteOutput> | SqlWrapQueryWriteOutput> => {
    const rows = prepareWriteData(
      Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows]
    );

    if (rows.length) {
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
          const { text, values } = buildInsertQuery({ table, rows });
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

    if (rows.length) {
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
          const { text, values } = buildInsertQuery({
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
      const { values } = reduceRowsIntoPlaceholdersAndValues(
        [update.update].concat(update.where)
      );

      return {
        text: `UPDATE ${wrapUptick(table)} SET ${_.map(
          update.update,
          (v, k) => `${k} = ${v instanceof TemplatedValue ? v.template : '?'}`
        ).join(', ')} ${update.where ? 'WHERE' : ''} ${_.map(
          update.where,
          (v, k: string) =>
            `${k} ${Array.isArray(v) ? 'IN' : '='} (${v instanceof
            TemplatedValue
              ? v.template
              : '?'})`
        ).join(' AND ')}`,
        values,
      };
    };

    const queries = _.map(updates, update =>
      buildUpdateQuery({ table, update })
    );

    return driver.query({
      sql: _.map(queries, ({ text }) => text).join(';\n'),
      values: _.chain(queries).map(({ values }) => values).flatten().value(),
    });
  };

  self.delete = (
    table: string,
    where?: Object | Array<Object>
  ): Promise<SqlWrapQueryWriteOutput> => {
    if (Array.isArray(where) && !where.length) {
      return Promise.resolve();
    }

    const q = query.build().delete().from(wrapUptick(table));
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

    if (rows.length) {
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
          let { text, values } = buildInsertQuery({ table, rows });

          text += ` ON DUPLICATE KEY UPDATE ${_.map(
            _.first(rows),
            (v, k) => `${k} = VALUES(${k})`
          ).join(', ')}`;

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
