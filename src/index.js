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
  connectionPool,
  sqlType,
}: {
  connectionPool: SqlWrapConnectionPool,
  sqlType: SqlWrapType,
}) => {
  const self = {};

  const query = createQuery({ connectionPool });
  const read = createRead({ connectionPool, sqlType });
  const write = createWrite({ connectionPool, sqlType });

  self.query = (
    textOrConfig: string | SqlWrapQueryConfig,
    values?: SqlWrapInputValues
  ): Promise<Array<Object> | SqlWrapQueryWriteOutput> =>
    query.rows(textOrConfig, values);

  self.queryStream = (
    textOrConfig: string | SqlWrapQueryStreamConfig,
    values?: SqlWrapInputValues
  ) => {};

  self.select = (
    testOrConfig: string | SqlWrapSelectConfig,
    where?: Object
  ) => {};

  self.selectStream = (
    testOrConfig: string | SqlWrapSelectStreamConfig,
    values?: SqlWrapInputValues
  ) => {};

  self.insert = (
    table: string,
    rowOrRows: Array<Object> | Object
  ): Promise<*> => write.insert(table, rowOrRows);

  self.replace = (table: string, rowOrRows: Array<Object> | Object) => {};

  self.save = (table: string, rowOrRows: Array<Object> | Object) => {};

  self.update = (
    table: string,
    rowOrRows: Array<Object> | Object,
    where?: Object
  ) => {};

  self.delete = (table: string, where?: Object) => {};

  self.build = () => {};

  return self;
};
