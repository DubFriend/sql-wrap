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

import type Promise from 'bluebird';
import _ from 'lodash';

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

  self.rows = (
    textOrConfig: string | SqlWrapQueryConfig,
    maybeValues?: SqlWrapInputValues
  ): Promise<SqlWrapQueryWriteOutput | Array<Object>> => {
    const { sql, values } = resolveRowsConfig(textOrConfig, maybeValues);
    return connectionPool.query({ sql, values });
  };

  return self;
};
