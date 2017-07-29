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

  self.insert = (
    table: string,
    rowOrRows: Array<Object> | Object
  ): Promise<SqlWrapQueryWriteOutput> => {
    const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];

    if (rows.length) {
      const response: any = query
        .build()
        .insert()
        .into(wrapUptick(table))
        .setFieldsRows(_.map(rows, r => _.mapKeys(r, (v, k) => wrapUptick(k))))
        .run();
      return response;
    } else {
      return Promise.resolve({
        fieldCount: 0,
        affectedRows: 0,
        insertId: 0,
        serverStatus: 0,
        warningCount: 0,
        message: '',
        changedRows: 0,
      });
    }
  };

  self.update = (
    table: string,
    updates: Object,
    where?: Object
  ): Promise<SqlWrapQueryWriteOutput> => {
    const q = query
      .build()
      .update()
      .table(wrapUptick(table))
      .setFields(_.mapKeys(updates, (v, k) => wrapUptick(k)));

    if (where) {
      _.each(where, (v, k) => {
        q.where(`${wrapUptick(k)} = ?`, v);
      });
    }

    const response: any = q.run();
    return response;
  };

  self.delete = (
    table: string,
    where?: Object
  ): Promise<SqlWrapQueryWriteOutput> => {
    const q = query.build().delete().from(wrapUptick(table));
    if (where) {
      _.each(where, (v, k) => {
        q.where(`${wrapUptick(k)} = ?`, v);
      });
    }
    const response: any = q.run();
    return response;
  };

  self.save = (
    table: string,
    rowOrRows: Array<Object> | Object
  ): Promise<SqlWrapQueryWriteOutput> => {
    const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];

    if (rows.length) {
      const q = query
        .build()
        .insert()
        .into(wrapUptick(table))
        .setFieldsRows(_.map(rows, r => _.mapKeys(r, (v, k) => wrapUptick(k))));

      _.each(_.first(rows), (v, k) => {
        q.onDupUpdate(`${wrapUptick(k)} = VALUES(${wrapUptick(k)})`);
      });

      const response: any = q.run();
      return response;
    } else {
      return Promise.resolve({
        fieldCount: 0,
        affectedRows: 0,
        insertId: 0,
        serverStatus: 0,
        warningCount: 0,
        message: '',
        changedRows: 0,
      });
    }
  };

  self.replace = (
    table: string,
    rowOrRows: Array<Object> | Object
  ): Promise<SqlWrapQueryWriteOutput> => {
    const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];

    if (rows.length) {
      const response: any = query
        .build()
        .replace()
        .into(wrapUptick(table))
        .setFieldsRows(_.map(rows, r => _.mapKeys(r, (v, k) => wrapUptick(k))))
        .run();
      return response;
    } else {
      return Promise.resolve({
        fieldCount: 0,
        affectedRows: 0,
        insertId: 0,
        serverStatus: 0,
        warningCount: 0,
        message: '',
        changedRows: 0,
      });
    }
  };

  return self;
};
