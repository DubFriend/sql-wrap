'use strict';

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _query = require('./query');

var _query2 = _interopRequireDefault(_query);

var _squel = require('squel');

var _squel2 = _interopRequireDefault(_squel);

var _wrapUptick = require('./wrap-uptick');

var _wrapUptick2 = _interopRequireDefault(_wrapUptick);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function (_ref) {
  var driver = _ref.driver,
      sqlType = _ref.sqlType;

  var self = {};

  var query = (0, _query2.default)({ driver: driver, sqlType: sqlType });

  self.insert = function (table, rowOrRows) {
    var rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];

    if (rows.length) {
      var response = query.build().insert().into((0, _wrapUptick2.default)(table)).setFieldsRows(_lodash2.default.map(rows, function (r) {
        return _lodash2.default.mapKeys(r, function (v, k) {
          return (0, _wrapUptick2.default)(k);
        });
      })).run();
      return response;
    } else {
      return _bluebird2.default.resolve({
        fieldCount: 0,
        affectedRows: 0,
        insertId: 0,
        serverStatus: 0,
        warningCount: 0,
        message: '',
        changedRows: 0
      });
    }
  };

  self.update = function (table, updates, where) {
    var q = query.build().update().table((0, _wrapUptick2.default)(table)).setFields(_lodash2.default.mapKeys(updates, function (v, k) {
      return (0, _wrapUptick2.default)(k);
    }));

    if (where) {
      _lodash2.default.each(where, function (v, k) {
        q.where((0, _wrapUptick2.default)(k) + ' = ?', v);
      });
    }

    var response = q.run();
    return response;
  };

  self.delete = function (table, where) {
    var q = query.build().delete().from((0, _wrapUptick2.default)(table));
    if (where) {
      _lodash2.default.each(where, function (v, k) {
        q.where((0, _wrapUptick2.default)(k) + ' = ?', v);
      });
    }
    var response = q.run();
    return response;
  };

  self.save = function (table, rowOrRows) {
    var rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];

    if (rows.length) {
      var q = query.build().insert().into((0, _wrapUptick2.default)(table)).setFieldsRows(_lodash2.default.map(rows, function (r) {
        return _lodash2.default.mapKeys(r, function (v, k) {
          return (0, _wrapUptick2.default)(k);
        });
      }));

      _lodash2.default.each(_lodash2.default.first(rows), function (v, k) {
        q.onDupUpdate((0, _wrapUptick2.default)(k) + ' = VALUES(' + (0, _wrapUptick2.default)(k) + ')');
      });

      var response = q.run();
      return response;
    } else {
      return _bluebird2.default.resolve({
        fieldCount: 0,
        affectedRows: 0,
        insertId: 0,
        serverStatus: 0,
        warningCount: 0,
        message: '',
        changedRows: 0
      });
    }
  };

  self.replace = function (table, rowOrRows) {
    var rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];

    if (rows.length) {
      var response = query.build().replace().into((0, _wrapUptick2.default)(table)).setFieldsRows(_lodash2.default.map(rows, function (r) {
        return _lodash2.default.mapKeys(r, function (v, k) {
          return (0, _wrapUptick2.default)(k);
        });
      })).run();
      return response;
    } else {
      return _bluebird2.default.resolve({
        fieldCount: 0,
        affectedRows: 0,
        insertId: 0,
        serverStatus: 0,
        warningCount: 0,
        message: '',
        changedRows: 0
      });
    }
  };

  return self;
};