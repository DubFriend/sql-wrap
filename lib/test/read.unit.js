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


var read = require('../read')({ driver: _sql.pool, sqlType: 'mysql' });

describe('read.unit', function () {
  before(function () {
    return (0, _sql.clearAllTables)().then(function () {
      return _bluebird2.default.all([(0, _sql.insert)('key', { id: 'A' }), (0, _sql.insert)('key', { id: 'B' }), (0, _sql.insert)('compoundKey', { a: 'A', b: 'B' })]);
    });
  });

  describe('select', function () {
    it('should select based on where object', function () {
      return read.select('key', { id: 'A' }).then(function (rows) {
        expect(rows).to.deep.equal([{ id: 'A' }]);
      });
    });

    it('should support options object', function () {
      return read.select({
        table: 'key',
        where: { id: 'A' }
      }).then(function (rows) {
        expect(rows).to.deep.equal([{ id: 'A' }]);
      });
    });

    it('should have option to choose fields', function () {
      return read.select({
        table: 'compoundKey',
        fields: ['b'],
        where: { a: 'A' }
      }).then(function (rows) {
        expect(rows).to.deep.equal([{ b: 'B' }]);
      });
    });
  });

  describe('stream', function () {
    it('should return readable stream or results', function (done) {
      var s = read.stream({ table: 'compoundKey' });
      var expectedStream = [{ a: 'A', b: 'B' }];
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

  describe('selectOne', function () {
    it('should get a single row', function () {
      return read.selectOne('key', { id: 'A' }).then(function (row) {
        expect(row).to.deep.equal({ id: 'A' });
      });
    });
  });
});