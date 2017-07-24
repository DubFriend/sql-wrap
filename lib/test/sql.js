'use strict';

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var rawPool = require('mysql').createPool({
  host: '127.0.0.1',
  user: 'root',
  password: 'password',
  database: 'test'
});

exports.pool = {
  query: function query(_ref) {
    var sql = _ref.sql,
        values = _ref.values;
    return new _bluebird2.default(function (resolve, reject) {
      rawPool.query({ sql: sql, values: values }, function (err, results) {
        return err ? reject(err) : resolve(results);
      });
    });
  },
  getConnection: function getConnection() {
    return new _bluebird2.default(function (resolve, reject) {
      rawPool.getConnection(function (err, connection) {
        if (err) {
          reject(err);
        } else if (connection) {
          resolve({
            query: function query(_ref2) {
              var sql = _ref2.sql,
                  values = _ref2.values;
              return new _bluebird2.default(function (resolve, reject) {
                connection && typeof connection.query === 'function' && connection.query({ sql: sql, values: values }, function (err, results) {
                  return err ? reject(err) : resolve(results);
                }) || reject(new Error('connection.query is not a function'));
              });
            },
            release: function release() {
              if (connection && typeof connection.release === 'function') {
                connection.release();
              } else {
                throw new Error('connection.release is not a function');
              }
            }
          });
        } else {
          reject(new Error('connection not found'));
        }
      });
      // rawPool.getConnection(
      //   (err, connection) =>
      //     err
      //       ? reject(err)
      //       : resolve({
      //           // connection
      //           query: ({
      //             sql,
      //             values,
      //           }: {
      //             sql: string,
      //             values?: Array<mixed>,
      //           }) =>
      //             new Promise((resolve, reject) => {
      //               connection.query(
      //                 { sql, values },
      //                 (err, results) => (err ? reject(err) : resolve(results))
      //               );
      //             }),
      //         })
      // );
    });
  }
};

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
  return _bluebird2.default.all([exports.truncateTable('autoInc'), exports.truncateTable('compoundKey'), exports.truncateTable('defaultValue'), exports.truncateTable('key')]);
};

exports.insert = function (table, row) {
  return exports.pool.query({
    sql: 'INSERT INTO `' + table + '` SET ?',
    values: Array.isArray(row) ? row : [row]
  });
};