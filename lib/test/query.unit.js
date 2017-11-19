'use strict';

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _chai = require('chai');

var _chai2 = _interopRequireDefault(_chai);

var _chaiAsPromised = require('chai-as-promised');

var _chaiAsPromised2 = _interopRequireDefault(_chaiAsPromised);

var _sql = require('./sql');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_chai2.default.use(_chaiAsPromised2.default);
/* eslint-disable no-unused-expressions */
var expect = _chai2.default.expect;


var query = require('../query')({ driver: _sql.pool, sqlType: 'mysql' });

describe('query', function () {
  beforeEach(_sql.clearAllTables);

  describe('row', function () {
    it('should return single row', function () {
      return (0, _sql.insert)('autoInc', { id: 1 }).then(function () {
        return query.row('SELECT * FROM autoInc');
      }).then(function (rows) {
        expect(rows).to.deep.equal({ id: 1 });
      });
    });
  });

  describe('rows', function () {
    it('should execute basic insert query', function () {
      return query.rows('INSERT INTO `key` (id) VALUES (?)', ['a']).then(function (resp) {
        expect(JSON.parse(JSON.stringify(resp))).to.deep.equal({
          fieldCount: 0,
          affectedRows: 1,
          insertId: 0,
          serverStatus: 2,
          warningCount: 0,
          message: '',
          protocol41: true,
          changedRows: 0
        });
      });
    });

    it('should return insertId on autoInc query', function () {
      return query.rows('INSERT INTO autoInc (id) VALUES(?)', [1]).then(function (resp) {
        expect(JSON.parse(JSON.stringify(resp))).to.deep.equal({
          fieldCount: 0,
          affectedRows: 1,
          insertId: 1,
          serverStatus: 2,
          warningCount: 0,
          message: '',
          protocol41: true,
          changedRows: 0
        });
      });
    });

    it('should return array of rows on select', function () {
      return (0, _sql.insert)('autoInc', { id: 1 }).then(function () {
        return query.rows('SELECT * FROM autoInc');
      }).then(function (rows) {
        expect(rows).to.deep.equal([{ id: 1 }]);
      });
    });

    it('should perform update', function () {
      return (0, _sql.insert)('key', { id: 'A' }).then(function () {
        return query.rows('UPDATE ?? SET id=?', ['key', 'B']);
      }).then(function (resp) {
        expect(JSON.parse(JSON.stringify(resp))).to.deep.equal({
          fieldCount: 0,
          affectedRows: 1,
          insertId: 0,
          serverStatus: 34,
          warningCount: 0,
          message: '(Rows matched: 1  Changed: 1  Warnings: 0',
          protocol41: true,
          changedRows: 1
        });
      }).then(function () {
        return (0, _sql.all)('key');
      }).then(function (rows) {
        expect(rows).to.deep.equal([{ id: 'B' }]);
      });
    });

    it('should perform delete', function () {
      return (0, _sql.insert)('key', { id: 'A' }).then(function () {
        return query.rows('DELETE FROM ??', ['key']);
      }).then(function (resp) {
        expect(JSON.parse(JSON.stringify(resp))).to.deep.equal({
          fieldCount: 0,
          affectedRows: 1,
          insertId: 0,
          serverStatus: 34,
          warningCount: 0,
          message: '',
          protocol41: true,
          changedRows: 0
        });
      }).then(function () {
        return (0, _sql.all)('key');
      }).then(function (rows) {
        expect(rows).to.deep.equal([]);
      });
    });

    it('should have option to nest join', function () {
      return _bluebird2.default.all([(0, _sql.insert)('key', { id: 'A' }), (0, _sql.insert)('compoundKey', { a: 'A', b: 'B' })]).then(function () {
        return query.rows({
          sql: 'SELECT * FROM `key` k\n              JOIN compoundKey ck\n              ON k.id = ck.a',
          nestTables: true
        }).then(function (rows) {
          expect(rows).to.deep.equal([{
            k: { id: 'A' },
            ck: { a: 'A', b: 'B' }
          }]);
        });
      });
    });

    it('should option to return resultCount', function () {
      return (0, _sql.insert)('key', { id: 'A' }).then(function () {
        return query.rows({ sql: 'SELECT * FROM `key`', resultCount: true });
      }).then(function (resp) {
        _chai2.default.assert.deepEqual(resp, {
          resultCount: 1,
          results: [{ id: 'A' }]
        });
      });
    });

    it('should have option to paginate', function () {
      return _bluebird2.default.all([(0, _sql.insert)('key', { id: 'A' }), (0, _sql.insert)('key', { id: 'B' })]).then(function () {
        return query.rows({
          sql: 'SELECT * FROM `key` ORDER BY id',
          paginate: {
            page: 1,
            resultsPerPage: 1
          }
        });
      }).then(function (resp) {
        expect(resp).to.deep.equal({
          results: [{ id: 'A' }],
          resultCount: 2,
          pageCount: 2,
          currentPage: 1
        });
        return query.rows({
          sql: 'SELECT * FROM `key` ORDER BY id',
          paginate: {
            page: 2,
            resultsPerPage: 1
          }
        });
      }).then(function (resp) {
        expect(resp).to.deep.equal({
          results: [{ id: 'B' }],
          resultCount: 2,
          pageCount: 2,
          currentPage: 2
        });
      });
    });
  });

  describe('stream', function () {
    it('should stream found rows', function (done) {
      (0, _sql.insert)('key', { id: 'A' }).then(function () {
        var expectedStream = [{ id: 'A' }];
        var s = query.stream('SELECT * FROM `key`');
        s.on('error', done);
        s.on('data', function (row) {
          expect(row).to.deep.equal(expectedStream.shift());
        });
        s.on('end', function () {
          expect(expectedStream).to.have.lengthOf(0);
          done();
        });
      });
    });
  });

  describe('build', function () {
    var rowsToEdges = function rowsToEdges(rows, fields) {
      return _lodash2.default.map(rows, function (r) {
        return {
          node: r,
          cursor: toCursor(r, fields || ['a'])
        };
      });
    };

    var toCursor = function toCursor(r, fields) {
      return new Buffer(_lodash2.default.map(Array.isArray(fields) ? fields : [fields], function (f) {
        return String(r[f]);
      }).join('#')).toString('base64');
    };

    var cursorFig = function cursorFig(od) {
      return {
        cursor: _lodash2.default.extend({ orderBy: 'a' }, od)
      };
    };

    var a = { a: 'A', b: 'A' };
    var b = { a: 'B', b: 'B' };
    var c = { a: 'C', b: 'A' };

    beforeEach(function () {
      return _bluebird2.default.all([(0, _sql.insert)('compoundKey', a), (0, _sql.insert)('compoundKey', b), (0, _sql.insert)('compoundKey', c)]);
    });

    it('should have option to nest join', function () {
      return (0, _sql.clearAllTables)().then(function () {
        return _bluebird2.default.all([(0, _sql.insert)('key', { id: 'A' }), (0, _sql.insert)('compoundKey', { a: 'A', b: 'B' })]);
      }).then(function () {
        return query.build().select().from('`key`', 'k').join('compoundKey', 'ck', 'k.id = ck.a').run({ nestTables: true }).then(function (rows) {
          expect(rows).to.deep.equal([{
            k: { id: 'A' },
            ck: { a: 'A', b: 'B' }
          }]);
        });
      });
    });

    it('should have option to paginate', function () {
      return (0, _sql.clearAllTables)().then(function () {
        return _bluebird2.default.all([(0, _sql.insert)('key', { id: 'A' }), (0, _sql.insert)('key', { id: 'B' })]);
      }).then(function () {
        return query.build().select().from('`key`').order('id').run({
          paginate: {
            page: 1,
            resultsPerPage: 1
          }
        });
      }).then(function (resp) {
        expect(resp).to.deep.equal({
          results: [{ id: 'A' }],
          resultCount: 2,
          pageCount: 2,
          currentPage: 1
        });
        return query.build().select().from('`key`').order('id').run({
          paginate: {
            page: 2,
            resultsPerPage: 1
          }
        });
      }).then(function (resp) {
        expect(resp).to.deep.equal({
          results: [{ id: 'B' }],
          resultCount: 2,
          pageCount: 2,
          currentPage: 2
        });
      });
    });

    it('should have cursor option', function () {
      return query.build().select().from('compoundKey').run(cursorFig({ first: 100 })).then(function (resp) {
        expect(resp).to.deep.equal({
          resultCount: 3,
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false
          },
          edges: rowsToEdges([a, b, c])
        });
      });
    });

    it('should handle orderBy with direction', function () {
      return query.build().select().from('compoundKey').run(cursorFig({
        first: 100,
        orderBy: { field: 'a', direction: 'DESC' }
      })).then(function (resp) {
        expect(resp).to.deep.equal({
          resultCount: 3,
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false
          },
          edges: rowsToEdges([c, b, a])
        });
      });
    });

    it('should handle orderBy with serialization', function () {
      return query.build().select().from('compoundKey').run(cursorFig({
        first: 100,
        orderBy: {
          field: 'a',
          serialize: function serialize(v) {
            return v.toLowerCase();
          }
        }
      })).then(function (resp) {
        expect(resp).to.deep.equal({
          resultCount: 3,
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false
          },
          edges: _lodash2.default.map([a, b, c], function (r) {
            return {
              node: r,
              cursor: toCursor({ a: r.a.toLowerCase() }, 'a')
            };
          })
        });
      });
    });

    it('should handle orderBy with deserialization', function () {
      return query.build().select().from('compoundKey').run(cursorFig({
        first: 100,
        after: toCursor({ a: b.a.toLowerCase() }, 'a'),
        orderBy: {
          field: 'a',
          deserialize: function deserialize(v) {
            return v.toLowerCase();
          }
        }
      })).then(function (resp) {
        expect(resp).to.deep.equal({
          resultCount: 1,
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false
          },
          edges: rowsToEdges([c])
        });
      });
    });

    it('should limit with "first" field', function () {
      return query.build().select().from('compoundKey').run(cursorFig({ first: 1 })).then(function (resp) {
        expect(resp).to.deep.equal({
          resultCount: 3,
          pageInfo: {
            hasNextPage: true,
            hasPreviousPage: false
          },
          edges: rowsToEdges([a])
        });
      });
    });

    it('should limit with the "last" field', function () {
      return query.build().select().from('compoundKey').run(cursorFig({ last: 1 })).then(function (resp) {
        expect(resp).to.deep.equal({
          resultCount: 3,
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: true
          },
          edges: rowsToEdges([c])
        });
      });
    });

    it('should enable next page selection with the "after" field', function () {
      return query.build().select().from('compoundKey').run(cursorFig({ first: 100, after: toCursor(a, 'a') })).then(function (resp) {
        expect(resp).to.deep.equal({
          resultCount: 2,
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false
          },
          edges: rowsToEdges([b, c])
        });
      });
    });

    it('should enable previous page selection with the "before" field', function () {
      return query.build().select().from('compoundKey').run(cursorFig({ last: 100, before: toCursor(c, 'a') })).then(function (resp) {
        expect(resp).to.deep.equal({
          resultCount: 2,
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false
          },
          edges: rowsToEdges([a, b])
        });
      });
    });

    it('should limit with "first" and "after"', function () {
      return query.build().select().from('compoundKey').run(cursorFig({
        first: 1,
        after: toCursor(a, 'a')
      })).then(function (resp) {
        expect(resp).to.deep.equal({
          resultCount: 2,
          pageInfo: {
            hasNextPage: true,
            hasPreviousPage: false
          },
          edges: rowsToEdges([b])
        });
      });
    });

    it('should limit with "last" and "after"', function () {
      return query.build().select().from('compoundKey').run(cursorFig({ last: 1, after: toCursor(a, 'a') })).then(function (resp) {
        expect(resp).to.deep.equal({
          resultCount: 2,
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: true
          },
          edges: rowsToEdges([c])
        });
      });
    });

    it('should limit with "first" and "before"', function () {
      return query.build().select().from('compoundKey').run(cursorFig({ first: 1, before: toCursor(c, 'a') })).then(function (resp) {
        expect(resp).to.deep.equal({
          resultCount: 2,
          pageInfo: {
            hasNextPage: true,
            hasPreviousPage: false
          },
          edges: rowsToEdges([a])
        });
      });
    });

    it('should limit with "last" and "before"', function () {
      return query.build().select().from('compoundKey').run(cursorFig({ last: 1, before: toCursor(c, 'a') })).then(function (resp) {
        expect(resp).to.deep.equal({
          resultCount: 2,
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: true
          },
          edges: rowsToEdges([b])
        });
      });
    });

    it('should handle compound orderBy', function () {
      var orderBy = ['b', 'a'];
      return query.build().select().from('compoundKey').run(cursorFig({ orderBy: orderBy, first: 100 })).then(function (resp) {
        expect(resp).to.deep.equal({
          resultCount: 3,
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false
          },
          edges: rowsToEdges([a, c, b], orderBy)
        });
      });
    });

    it('should handle compound orderBy with direction', function () {
      var orderBy = [{ field: 'b' }, { field: 'a', direction: 'DESC' }];

      return query.build().select().from('compoundKey').run(cursorFig({ orderBy: orderBy, first: 100 })).then(function (resp) {
        expect(resp).to.deep.equal({
          resultCount: 3,
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false
          },
          edges: rowsToEdges([c, a, b], _lodash2.default.map(orderBy, function (o) {
            return o.field;
          }))
        });
      });
    });

    it('should handle compound orderBy with complex fig', function () {
      var orderBy = ['b', 'a'];
      return query.build().select().from('compoundKey').run(cursorFig({
        orderBy: orderBy,
        first: 2,
        before: toCursor(b, orderBy),
        after: toCursor(a, orderBy)
      })).then(function (resp) {
        expect(resp).to.deep.equal({
          resultCount: 1,
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false
          },
          edges: rowsToEdges([c], orderBy)
        });
      });
    });

    it('should handle compound orderBy with complex fig with direction', function () {
      var orderBy = [{ field: 'b' }, { field: 'a', direction: 'DESC' }];
      return query.build().select().from('compoundKey').run(cursorFig({
        orderBy: orderBy,
        first: 2,
        before: toCursor(b, _lodash2.default.map(orderBy, function (o) {
          return o.field;
        }))
      })).then(function (resp) {
        expect(resp).to.deep.equal({
          resultCount: 2,
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false
          },
          edges: rowsToEdges([c, a], _lodash2.default.map(orderBy, function (o) {
            return o.field;
          }))
        });
      });
    });

    describe('whereIn', function () {
      it('should have a whereIn method', function () {
        return query.build().select().from('compoundKey').whereIn([{ a: 'A', b: 'A' }, { a: 'B', b: 'B' }]).run().then(function (resp) {
          expect(resp).to.have.lengthOf(2);
          expect(resp).to.have.deep.members([a, b]);
        });
      });

      it('should handle single element', function () {
        return query.build().select().from('compoundKey').whereIn([{ a: 'A', b: 'A' }]).run().then(function (resp) {
          expect(resp).to.have.lengthOf(1);
          expect(resp).to.have.deep.members([a]);
        });
      });

      it('should handle on empty array', function () {
        return query.build().select().from('compoundKey').whereIn([]).run().then(function (resp) {
          expect(resp).to.deep.equal([]);
        });
      });
    });

    it('should have whereIfDefined method', function () {
      return query.build().select().from('compoundKey').whereIfDefined('a = ?', undefined).run().then(function (resp) {
        expect(resp).to.have.deep.members([a, b, c]);
        return query.build().select().from('compoundKey').whereIfDefined('a = ?', 'Z').run();
      }).then(function (resp) {
        expect(resp).to.deep.equal([]);
      });
    });

    it('should return query generator', function () {
      return query.build().select().from('compoundKey').where('a = ?', c.a).run().then(function (resp) {
        _chai2.default.assert.deepEqual(resp, [c]);
      });
    });

    it('should option to return resultCount', function () {
      return query.build().select().from('compoundKey').where('a = ?', c.a).run({ resultCount: true }).then(function (resp) {
        _chai2.default.assert.deepEqual(resp, {
          resultCount: 1,
          results: [c]
        });
      });
    });

    it('should be invokable through a "one" command', function () {
      return query.build().select().from('compoundKey').where('a = ?', c.a).one().then(function (resp) {
        _chai2.default.assert.deepEqual(resp, c);
      });
    });
  });
});