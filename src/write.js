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
import createQuery from './query';
import squel from 'squel';

module.exports = ({
  connectionPool,
  sqlType,
}: {
  connectionPool: SqlWrapConnectionPool,
  sqlType: SqlWrapType,
}) => {
  const self = {};

  const query = createQuery({ connectionPool });

  const prepareInsertRows = (rows: Array<Object>) => {
    const values = [];
    const fields = _.keys(_.first(rows));
    const fieldsSQL =
      '(' +
      _.map(fields, field => {
        values.push(field);
        return '??';
      }).join(', ') +
      ')';

    const valuesSQL = _.map(
      rows,
      row =>
        '(' +
        _.map(fields, field => {
          values.push(row[field]);
          return '?';
        }).join(', ') +
        ')'
    ).join(', ');

    return { sql: `${fieldsSQL} VALUES ${valuesSQL}`, values };
  };

  self.insert = (
    table: string,
    rowOrRows: Array<Object> | Object
  ): Promise<SqlWrapQueryWriteOutput> => {
    const rows: Array<Object> = Array.isArray(rowOrRows)
      ? rowOrRows
      : [rowOrRows];
    const { sql, values } = prepareInsertRows(rows);

    // make the typechecker happy
    const response: any = query.rows(
      `INSERT INTO ?? ${sql}`,
      [table].concat(values)
    );
    return response;
  };
  // self.insert = (
  //   table: string,
  //   rowOrRows: Array<Object> | Object
  // ): Promise<SqlWrapQueryWriteOutput> => {
  //   const rows: Array<Object> = Array.isArray(rowOrRows)
  //     ? rowOrRows
  //     : [rowOrRows];
  //   const { sql, values } = prepareInsertRows(rows);

  //   // make the typechecker happy
  //   const response: any = query.rows(
  //     `INSERT INTO ?? ${sql}`,
  //     [table].concat(values)
  //   );
  //   return response;
  // };

  return self;
};
