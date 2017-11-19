'use strict';

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function (rawPool) {
  return {
    query: function query(_ref) {
      var sql = _ref.sql,
          nestTables = _ref.nestTables,
          values = _ref.values;
      return new _bluebird2.default(function (resolve, reject) {
        rawPool.query({ sql: sql, nestTables: nestTables, values: values }, function (err, results) {
          return err ? reject(err) : resolve(results);
        });
      });
    },
    stream: function stream(_ref2) {
      var sql = _ref2.sql,
          nestTables = _ref2.nestTables,
          values = _ref2.values;
      return rawPool.query({ sql: sql, nestTables: nestTables, values: values }).stream();
    },
    getConnection: function getConnection() {
      return new _bluebird2.default(function (resolve, reject) {
        rawPool.getConnection(function (err, connection) {
          if (err) {
            reject(err);
          } else if (connection) {
            resolve({
              stream: function stream(_ref3) {
                var sql = _ref3.sql,
                    nestTables = _ref3.nestTables,
                    values = _ref3.values;

                if (connection && typeof connection.stream === 'function') {
                  return connection.stream({ sql: sql, nestTables: nestTables, values: values }).stream();
                } else {
                  throw new Error('connection.stream is not a function');
                }
              },
              query: function query(_ref4) {
                var sql = _ref4.sql,
                    nestTables = _ref4.nestTables,
                    values = _ref4.values;
                return new _bluebird2.default(function (resolve, reject) {
                  connection && typeof connection.query === 'function' && connection.query({ sql: sql, nestTables: nestTables, values: values }, function (err, results) {
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
      });
    }
  };
};