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

var resolveConfig = function resolveConfig(tableOrConfig, where) {
  var resolved = {};
  if (typeof tableOrConfig === 'string') {
    resolved.table = tableOrConfig;
  } else {
    resolved.table = tableOrConfig.table;
    resolved.fields = tableOrConfig.fields;
    resolved.paginate = tableOrConfig.paginate;
    resolved.where = tableOrConfig.where;
  }

  if (where) {
    resolved.where = where;
  }

  return resolved;
};

module.exports = function (_ref) {
  var driver = _ref.driver,
      sqlType = _ref.sqlType;

  var self = {};

  var query = (0, _query2.default)({ driver: driver, sqlType: sqlType });

  self.select = function (tableOrConfig, maybeWhere) {
    var _resolveConfig = resolveConfig(tableOrConfig, maybeWhere),
        table = _resolveConfig.table,
        fields = _resolveConfig.fields,
        nestTables = _resolveConfig.nestTables,
        paginate = _resolveConfig.paginate,
        where = _resolveConfig.where;

    var q = query.build().select().from((0, _wrapUptick2.default)(table));
    if (where) {
      _lodash2.default.each(where, function (v, k) {
        q.where((0, _wrapUptick2.default)(k) + ' = ?', v);
      });
    }
    if (fields) {
      _lodash2.default.each(fields, function (f) {
        q.field(f);
      });
    }
    var response = q.run({ paginate: paginate, nestTables: nestTables });
    return response;
  };

  self.stream = function (tableOrConfig, maybeWhere) {
    var _resolveConfig2 = resolveConfig(tableOrConfig, maybeWhere),
        table = _resolveConfig2.table,
        fields = _resolveConfig2.fields,
        nestTables = _resolveConfig2.nestTables,
        where = _resolveConfig2.where;

    var q = query.build().select().from((0, _wrapUptick2.default)(table));
    if (where) {
      _lodash2.default.each(where, function (v, k) {
        q.where((0, _wrapUptick2.default)(k) + ' = ?', v);
      });
    }
    if (fields) {
      _lodash2.default.each(fields, function (f) {
        q.field(f);
      });
    }
    return q.stream({ nestTables: nestTables });
  };

  self.selectOne = function (tableOrConfig, maybeWhere) {
    return self.select(tableOrConfig, maybeWhere).then(function (resp) {
      var response = Array.isArray(resp) ? _lodash2.default.first(resp) : _lodash2.default.first(resp.results);
      return response || null;
    });
  };

  return self;
};