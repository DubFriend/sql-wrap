'use strict';

var _squel = require('squel');

var _squel2 = _interopRequireDefault(_squel);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _query = require('./query');

var _query2 = _interopRequireDefault(_query);

var _read = require('./read');

var _read2 = _interopRequireDefault(_read);

var _write = require('./write');

var _write2 = _interopRequireDefault(_write);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function (_ref) {
  var driver = _ref.driver,
      sqlType = _ref.sqlType;

  var self = {};

  var query = (0, _query2.default)({ driver: driver, sqlType: sqlType });
  var read = (0, _read2.default)({ driver: driver, sqlType: sqlType });
  var write = (0, _write2.default)({ driver: driver, sqlType: sqlType });

  self.query = function (textOrConfig, values) {
    return query.rows(textOrConfig, values);
  };

  self.one = self.queryStream = function (textOrConfig, values) {
    return query.row(textOrConfig, values);
  };

  // self.select = (testOrConfig: *, where?: *) =>
  //   read.select(textOrConfig, where);

  // self.selectStream = (testOrConfig: *, where?: *): * =>
  //   read.selectStream(textOrConfig, where);

  self.insert = function (table, rowOrRows) {
    return write.insert(table, rowOrRows);
  };

  // self.replace = (table: *, rowOrRows: *): * => write.replace(table, rowOrRows);

  // self.save = (table: *, rowOrRows: *) => write.save(table, rowOrRows);

  // self.update = (table: *, rowOrRows: *, where?: *): * =>
  //   write.update(table, rowOrRows, where);

  // self.delete = (table: *, where?: *): * => write.delete(table, where);

  self.build = function () {
    return query.build();
  };

  return self;
};