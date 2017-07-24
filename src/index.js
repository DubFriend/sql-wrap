// @flow

import type {
  SqlWrapQuery,
  SqlWrapConnection,
  SqlWrapConnectionPool,
  SqlWrapInputValues,
  SqlWrapPagination,
  SqlWrapQueryConfig,
  SqlWrapQueryStreamConfig,
  SqlWrapSelectConfig,
  SqlWrapSelectStreamConfig,
  SqlWrapType,
  SqlWrapQueryWriteOutput,
} from './type';

import squel from 'squel';
import Promise from 'bluebird';
import _ from 'lodash';
import createQuery from './query';
import createRead from './read';
import createWrite from './write';

module.exports = ({
  driver,
  sqlType,
}: {
  driver: SqlWrapConnectionPool,
  sqlType: SqlWrapType,
}) => {
  const self = {};

  const query = createQuery({ driver, sqlType });
  const read = createRead({ driver, sqlType });
  const write = createWrite({ driver, sqlType });

  self.query = (textOrConfig: *, values?: *): * =>
    query.rows(textOrConfig, values);

  self.one = self.queryStream = (textOrConfig: *, values?: *): * =>
    query.row(textOrConfig, values);

  // self.select = (testOrConfig: *, where?: *) =>
  //   read.select(textOrConfig, where);

  // self.selectStream = (testOrConfig: *, where?: *): * =>
  //   read.selectStream(textOrConfig, where);

  self.insert = (table: *, rowOrRows: *): * => write.insert(table, rowOrRows);

  // self.replace = (table: *, rowOrRows: *): * => write.replace(table, rowOrRows);

  // self.save = (table: *, rowOrRows: *) => write.save(table, rowOrRows);

  // self.update = (table: *, rowOrRows: *, where?: *): * =>
  //   write.update(table, rowOrRows, where);

  // self.delete = (table: *, where?: *): * => write.delete(table, where);

  self.build = (): * => query.build();

  return self;
};
