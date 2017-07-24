'use strict';

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _query = require('./query');

var _query2 = _interopRequireDefault(_query);

var _squel = require('squel');

var _squel2 = _interopRequireDefault(_squel);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function (_ref) {
  var driver = _ref.driver,
      sqlType = _ref.sqlType;

  var self = {};

  var query = (0, _query2.default)({ driver: driver, sqlType: sqlType });

  var prepareInsertRows = function prepareInsertRows(rows) {
    var values = [];
    var fields = _lodash2.default.keys(_lodash2.default.first(rows));
    var fieldsSQL = '(' + _lodash2.default.map(fields, function (field) {
      values.push(field);
      return '??';
    }).join(', ') + ')';

    var valuesSQL = _lodash2.default.map(rows, function (row) {
      return '(' + _lodash2.default.map(fields, function (field) {
        values.push(row[field]);
        return '?';
      }).join(', ') + ')';
    }).join(', ');

    return { sql: fieldsSQL + ' VALUES ' + valuesSQL, values: values };
  };

  self.insert = function (table, rowOrRows) {
    var rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];

    var _prepareInsertRows = prepareInsertRows(rows),
        sql = _prepareInsertRows.sql,
        values = _prepareInsertRows.values;

    // make the typechecker happy


    var response = query.rows('INSERT INTO ?? ' + sql, [table].concat(values));
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