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
} from './type';

import type Promise from 'bluebird';
import _ from 'lodash';
import createQuery from './query';

module.exports = ({
  connectionPool,
  sqlType,
}: {
  connectionPool: SqlWrapConnectionPool,
  sqlType: SqlWrapType,
}) => {
  const self = {};

  const query = createQuery({ connectionPool });

  return self;
};
