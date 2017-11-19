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
      : _.chain(d)
          .omitBy(_.isUndefined)
          .mapKeys((v, k) => wrapUptick(k))
          .value();

  self.insert = (
    table: string,
    rowOrRows: Array<Object> | Object
  ): Promise<Array<SqlWrapQueryWriteOutput> | SqlWrapQueryWriteOutput> => {
    const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];

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
          return query
            .build()
            .insert()
            .into(wrapUptick(table))
            .setFieldsRows(prepareWriteData(rows))
            .run()
            .then((resp: any) =>
              _.extend(resp, {
                bulkWriteKey: key,
              })
            );
        })
      ).then(resp => (Array.isArray(rowOrRows) ? resp : _.first(resp)));
    } else {
      return Promise.resolve([]);
    }
  };

  self.update = (
    table: string,
    updates: Object | Array<{ update: Object, where: Object | Array<Object> }>,
    where?: Object | Array<Object>
  ): Promise<*> => {
    if (Array.isArray(updates)) {
      const queries = _.map(updates, ({ update, where }) => {
        const q = query
          .build()
          .update()
          .table(wrapUptick(table))
          .setFields(prepareWriteData(update));

        if (where) {
          q.whereIn(Array.isArray(where) ? where : [where]);
        }

        return q.toParam();
      });

      return driver.query({
        sql: _.map(queries, ({ text }) => text).join(';\n'),
        values: _.chain(queries).map(({ values }) => values).flatten().value(),
      });
    } else {
      if (Array.isArray(where) && !where.length) {
        return Promise.resolve();
      }

      const q = query
        .build()
        .update()
        .table(wrapUptick(table))
        .setFields(prepareWriteData(updates));

      if (where) {
        q.whereIn(Array.isArray(where) ? where : [where]);
      }

      // const response: any = q.run();
      // return response;
      return q.run();
    }
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

  const keyByColumns = (fig: Object): string =>
    _.chain(fig).map((v, k) => k).sort().join(':');

  self.save = (
    table: string,
    rowOrRows: Array<Object> | Object
  ): Promise<Array<SqlWrapQueryWriteOutput> | SqlWrapQueryWriteOutput> => {
    const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];

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
          const q = query
            .build()
            .insert()
            .into(wrapUptick(table))
            .setFieldsRows(prepareWriteData(rows));

          _.each(_.first(rows), (v, k) => {
            q.onDupUpdate(`${wrapUptick(k)} = VALUES(${wrapUptick(k)})`);
          });

          return q.run().then((resp: any) =>
            _.extend(resp, {
              bulkWriteKey: key,
            })
          );
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
    const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];

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
          return query
            .build()
            .replace()
            .into(wrapUptick(table))
            .setFieldsRows(prepareWriteData(rows))
            .run()
            .then((resp: any) =>
              _.extend(resp, {
                bulkWriteKey: key,
              })
            );
        })
      ).then(resp => (Array.isArray(rowOrRows) ? resp : _.first(resp)));
    } else {
      return Promise.resolve([]);
    }
  };

  return self;
};
