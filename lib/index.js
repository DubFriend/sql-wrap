'use strict';

var _squel = require('squel');

var _squel2 = _interopRequireDefault(_squel);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _sqlstring = require('sqlstring');

var _sqlstring2 = _interopRequireDefault(_sqlstring);

var _query = require('./query');

var _query2 = _interopRequireDefault(_query);

var _read = require('./read');

var _read2 = _interopRequireDefault(_read);

var _write = require('./write');

var _write2 = _interopRequireDefault(_write);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var createSqlWrap = function createSqlWrap(_ref) {
  var driver = _ref.driver,
      sqlType = _ref.sqlType;

  var self = {};

  var query = (0, _query2.default)({ driver: driver, sqlType: sqlType });
  var read = (0, _read2.default)({ driver: driver, sqlType: sqlType });
  var write = (0, _write2.default)({ driver: driver, sqlType: sqlType });

  self.connection = function () {
    return query.getConnection().then(function (conn) {
      return createSqlWrap({ driver: conn, sqlType: sqlType });
    });
  };

  self.release = function () {
    if (driver.release && typeof driver.release === 'function') {
      driver.release();
    } else {
      throw new TypeError('release is not a function');
    }
  };

  self.query = function (textOrConfig, values) {
    return query.rows(textOrConfig, values);
  };

  self.one = self.queryStream = function (textOrConfig, values) {
    return query.row(textOrConfig, values);
  };

  self.select = function (textOrConfig, where) {
    return read.select(textOrConfig, where);
  };

  self.selectOne = function (textOrConfig, where) {
    return read.selectOne(textOrConfig, where);
  };

  self.stream = function (textOrConfig, where) {
    return query.stream(textOrConfig, where);
  };

  self.streamTable = function (textOrConfig, where) {
    return read.stream(textOrConfig, where);
  };

  self.queryStream = function (textOrConfig, where) {
    return _bluebird2.default.resolve(query.stream(textOrConfig, where));
  };

  self.selectStream = function (textOrConfig, where) {
    return _bluebird2.default.resolve(read.stream(textOrConfig, where));
  };

  self.insert = function (table, rowOrRows) {
    return write.insert(table, rowOrRows);
  };

  self.replace = function (table, rowOrRows) {
    return write.replace(table, rowOrRows);
  };

  self.save = function (table, rowOrRows) {
    return write.save(table, rowOrRows);
  };

  self.update = function (table, rowOrRows, where) {
    return write.update(table, rowOrRows, where);
  };

  self.delete = function (table, where) {
    return write.delete(table, where);
  };

  self.build = function () {
    return query.build();
  };

  self.escape = function (data) {
    return _sqlstring2.default.escape(data);
  };
  self.escapeId = function (data) {
    return _sqlstring2.default.escapeId(data);
  };

  return self;
};

module.exports = createSqlWrap;