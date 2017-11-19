'use strict';

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _chai = require('chai');

var _chai2 = _interopRequireDefault(_chai);

var _chaiAsPromised = require('chai-as-promised');

var _chaiAsPromised2 = _interopRequireDefault(_chaiAsPromised);

var _sinon = require('sinon');

var _sinon2 = _interopRequireDefault(_sinon);

var _sql = require('./sql');

var _stream = require('stream');

var _stream2 = _interopRequireDefault(_stream);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_chai2.default.use(_chaiAsPromised2.default);
/* eslint-disable no-unused-expressions */
var expect = _chai2.default.expect;


var index = require('../index')({ driver: _sql.pool, sqlType: 'mysql' });

describe('index.unit', function () {
  var stub = {};

  beforeEach(_sql.clearAllTables);

  afterEach(function () {
    _lodash2.default.each(stub, function (s) {
      return s.restore();
    });
  });

  describe('connection', function () {
    it('should get an instance of sqlWrap for a single connection', function () {
      return index.connection().then(function (conn) {
        expect(conn).to.have.include.keys('connection', 'query', 'select', 'stream', 'streamTable');
      });
    });
  });

  describe('query', function () {
    it('should return array of rows', function () {
      return index.query('SELECT * FROM `key`').then(function (rows) {
        expect(rows).to.deep.equal([]);
      });
    });
  });

  describe('one', function () {
    it('should return row or null', function () {
      return index.one('SELECT * FROM `key`').then(function (row) {
        expect(row).to.be.null;
      });
    });
  });

  describe('select', function () {
    it('should return rows', function () {
      return index.select('key').then(function (rows) {
        expect(rows).to.deep.equal([]);
      });
    });
  });

  describe('selectOne', function () {
    it('should return row or null', function () {
      return index.selectOne('key').then(function (row) {
        expect(row).to.be.null;
      });
    });
  });

  describe('stream', function () {
    it('should return results stream', function () {
      expect(index.stream('SELECT * FROM `key`')).to.be.instanceof(_stream2.default);
    });
  });

  describe('streamTable', function () {
    it('should return results stream', function () {
      expect(index.streamTable('key')).to.be.instanceof(_stream2.default);
    });
  });

  describe('selectStream', function () {
    it('should promise a results stream', function () {
      return index.selectStream('key').then(function (s) {
        expect(s).to.be.instanceof(_stream2.default);
      });
    });
  });

  describe('insert', function () {
    it('should insert row', function () {
      return index.insert('key', { id: 'a' }).then(function () {
        return (0, _sql.all)('key');
      }).then(function (rows) {
        expect(rows).to.deep.equal([{ id: 'a' }]);
      });
    });
  });

  describe('replace', function () {
    it('should replace row', function () {
      return index.replace('key', { id: 'a' }).then(function () {
        return (0, _sql.all)('key');
      }).then(function (rows) {
        expect(rows).to.deep.equal([{ id: 'a' }]);
      });
    });
  });

  describe('save', function () {
    it('should save row', function () {
      return index.save('key', { id: 'a' }).then(function () {
        return (0, _sql.all)('key');
      }).then(function (rows) {
        expect(rows).to.deep.equal([{ id: 'a' }]);
      });
    });
  });

  describe('update', function () {
    it('should update row', function () {
      return (0, _sql.insert)('compoundKey', { a: 'a', b: 'b' }).then(function () {
        return index.update('compoundKey', { b: 'c' });
      }).then(function () {
        return (0, _sql.all)('compoundKey');
      }).then(function (rows) {
        expect(rows).to.deep.equal([{ a: 'a', b: 'c' }]);
      });
    });
  });

  describe('delete', function () {
    it('should delete row', function () {
      return (0, _sql.insert)('key', { id: 'a' }).then(function () {
        return index.delete('key');
      }).then(function () {
        return (0, _sql.all)('key');
      }).then(function (rows) {
        expect(rows).to.have.lengthOf(0);
      });
    });
  });

  describe('build', function () {
    it('should return query builder', function () {
      return index.build().insert().into('`key` ').setFields({ id: 'a' }).run().then(function () {
        return (0, _sql.all)('key');
      }).then(function (rows) {
        expect(rows).to.deep.equal([{ id: 'a' }]);
      });
    });
  });

  describe('escape', function () {
    it('should escape value', function () {
      expect(index.escape(null)).to.equal('NULL');
    });
  });

  describe('escapeId', function () {
    it('should escape id', function () {
      expect(index.escapeId('foo')).to.equal('`foo`');
    });
  });
});