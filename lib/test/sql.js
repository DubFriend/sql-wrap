'use strict';

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _mysqlDriverAdapter = require('../mysql-driver-adapter');

var _mysqlDriverAdapter2 = _interopRequireDefault(_mysqlDriverAdapter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var rawPool = require('mysql').createPool({
  host: '127.0.0.1',
  user: 'root',
  password: 'password',
  database: 'test',
  multipleStatements: true
});

exports.pool = (0, _mysqlDriverAdapter2.default)(rawPool);

exports.truncateTable = function (table) {
  return exports.pool.query({
    sql: 'TRUNCATE TABLE ??',
    values: [table]
  });
};

exports.all = function (table) {
  return exports.pool.query({
    sql: 'SELECT * FROM ??',
    values: [table]
  });
};

exports.clearAllTables = function () {
  return _bluebird2.default.all([exports.truncateTable('autoInc'), exports.truncateTable('compoundKey'), exports.truncateTable('defaultValue'), exports.truncateTable('key'), exports.truncateTable('timestamp')]);
};

exports.insert = function (table, row) {
  return exports.pool.query({
    sql: 'INSERT INTO `' + table + '` SET ?',
    values: Array.isArray(row) ? row : [row]
  });
};