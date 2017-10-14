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

  var prepareWriteData = function prepareWriteData(d) {
    return Array.isArray(d) ? _lodash2.default.map(d, prepareWriteData) : _lodash2.default.chain(d).omitBy(_lodash2.default.isUndefined).mapKeys(function (v, k) {
      return (0, _wrapUptick2.default)(k);
    }).value();
  };

  self.insert = function (table, rowOrRows) {
    var rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];

    if (rows.length) {
      var grouped = {};
      _lodash2.default.each(rows, function (r) {
        var key = keyByColumns(r);
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(r);
      });

      return _bluebird2.default.all(_lodash2.default.map(grouped, function (rows, key) {
        return query.build().insert().into((0, _wrapUptick2.default)(table)).setFieldsRows(prepareWriteData(rows)).run().then(function (resp) {
          return _lodash2.default.extend(resp, {
            bulkWriteKey: key
          });
        });
      })).then(function (resp) {
        return Array.isArray(rowOrRows) ? resp : _lodash2.default.first(resp);
      });
    } else {
      return _bluebird2.default.resolve([]);
    }
  };

  self.update = function (table, updates, where) {
    if (Array.isArray(where) && !where.length) {
      return _bluebird2.default.resolve();
    }

    var q = query.build().update().table((0, _wrapUptick2.default)(table)).setFields(prepareWriteData(updates));

    if (where) {
      q.whereIn(Array.isArray(where) ? where : [where]);
    }

    var response = q.run();
    return response;
  };

  self.delete = function (table, where) {
    if (Array.isArray(where) && !where.length) {
      return _bluebird2.default.resolve();
    }

    var q = query.build().delete().from((0, _wrapUptick2.default)(table));
    if (where) {
      q.whereIn(Array.isArray(where) ? where : [where]);
    }
    var response = q.run();
    return response;
  };

  var keyByColumns = function keyByColumns(fig) {
    return _lodash2.default.chain(fig).map(function (v, k) {
      return k;
    }).sort().join(':');
  };

  self.save = function (table, rowOrRows) {
    var rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];

    if (rows.length) {
      var grouped = {};
      _lodash2.default.each(rows, function (r) {
        var key = keyByColumns(r);
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(r);
      });

      return _bluebird2.default.all(_lodash2.default.map(grouped, function (rows, key) {
        var q = query.build().insert().into((0, _wrapUptick2.default)(table)).setFieldsRows(prepareWriteData(rows));

        _lodash2.default.each(_lodash2.default.first(rows), function (v, k) {
          q.onDupUpdate((0, _wrapUptick2.default)(k) + ' = VALUES(' + (0, _wrapUptick2.default)(k) + ')');
        });

        return q.run().then(function (resp) {
          return _lodash2.default.extend(resp, {
            bulkWriteKey: key
          });
        });
      })).then(function (resp) {
        return Array.isArray(rowOrRows) ? resp : _lodash2.default.first(resp);
      });
    } else {
      return _bluebird2.default.resolve([]);
    }
  };

  self.replace = function (table, rowOrRows) {
    var rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];

    if (rows.length) {
      var grouped = {};
      _lodash2.default.each(rows, function (r) {
        var key = keyByColumns(r);
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(r);
      });

      return _bluebird2.default.all(_lodash2.default.map(grouped, function (rows, key) {
        return query.build().replace().into((0, _wrapUptick2.default)(table)).setFieldsRows(prepareWriteData(rows)).run().then(function (resp) {
          return _lodash2.default.extend(resp, {
            bulkWriteKey: key
          });
        });
      })).then(function (resp) {
        return Array.isArray(rowOrRows) ? resp : _lodash2.default.first(resp);
      });
    } else {
      return _bluebird2.default.resolve([]);
    }
  };

  return self;
};