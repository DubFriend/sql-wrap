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


var write = require('../write')({ driver: _sql.pool, sqlType: 'mysql' });

describe('write.unit', function () {
  beforeEach(_sql.clearAllTables);

  describe('insert', function () {
    it('should handle explicitly undefined column', function () {
      return write.insert('defaultValue', { id: 'a', default: undefined }).then(function () {
        return (0, _sql.all)('defaultValue');
      }).then(function (rows) {
        expect(rows).to.deep.equal([{ id: 'a', default: 'DEFAULT' }]);
      });
    });

    it('should create a new database row', function () {
      return write.insert('key', { id: 'A' }).then(function (resp) {
        expect(JSON.parse(JSON.stringify(resp))).to.deep.equal({
          bulkWriteKey: 'id',
          fieldCount: 0,
          affectedRows: 1,
          insertId: 0,
          serverStatus: 2,
          warningCount: 0,
          message: '',
          protocol41: true,
          changedRows: 0
        });
        return (0, _sql.all)('key');
      }).then(function (rows) {
        expect(rows).to.deep.equal([{ id: 'A' }]);
      });
    });

    it('should handle empty array', function () {
      return write.insert('key', []).then(function () {
        return (0, _sql.all)('key');
      }).then(function (rows) {
        expect(rows).to.have.lengthOf(0);
      });
    });

    it('should bulk insert', function () {
      return write.insert('key', [{ id: 'A' }, { id: 'B' }]).then(function () {
        return (0, _sql.all)('key');
      }).then(function (rows) {
        expect(rows).to.have.same.deep.members([{ id: 'A' }, { id: 'B' }]);
      });
    });

    it('should bulk insert with different length rows', function () {
      return write.insert('defaultValue', [{ id: 'A' }, { id: 'B', default: 'bar' }]).then(function () {
        return (0, _sql.all)('defaultValue');
      }).then(function (rows) {
        expect(rows).to.have.lengthOf(2);
        expect(rows).to.have.same.deep.members([{ id: 'A', default: 'DEFAULT' }, { id: 'B', default: 'bar' }]);
      });
    });

    it('should handle Date object as insert value', function () {
      return write.insert('timestamp', { id: new Date(2000) }).then(function () {
        return (0, _sql.all)('timestamp');
      }).then(function (rows) {
        expect(rows).to.deep.equal([{ id: new Date(2000) }]);
      });
    });
  });

  describe('update', function () {
    it('should update row according to where equals object', function () {
      return _bluebird2.default.all([(0, _sql.insert)('compoundKey', { a: 'A', b: 'B' }), (0, _sql.insert)('compoundKey', { a: 'M', b: 'N' })]).then(function () {
        return write.update('compoundKey', { b: 'C' }, { a: 'A' });
      }).then(function () {
        return (0, _sql.all)('compoundKey');
      }).then(function (rows) {
        expect(rows).to.have.same.deep.members([{ a: 'A', b: 'C' }, { a: 'M', b: 'N' }]);
      });
    });

    it('should handle explicitly undefined column', function () {
      return write.update('defaultValue', { id: 'a', default: undefined });
    });
  });

  describe('delete', function () {
    it('should delete row according to where equals object', function () {
      return _bluebird2.default.all([(0, _sql.insert)('key', { id: 'A' }), (0, _sql.insert)('key', { id: 'B' })]).then(function () {
        return write.delete('key', { id: 'A' });
      }).then(function () {
        return (0, _sql.all)('key');
      }).then(function (rows) {
        expect(rows).to.deep.equal([{ id: 'B' }]);
      });
    });
  });

  describe('save', function () {
    it('should insert row if does not exist', function () {
      return write.save('compoundKey', { b: 'B', a: 'A' }).then(function (resp) {
        expect(JSON.parse(JSON.stringify(resp))).to.deep.equal({
          bulkWriteKey: 'a:b',
          fieldCount: 0,
          affectedRows: 1,
          insertId: 0,
          serverStatus: 2,
          warningCount: 0,
          message: '',
          protocol41: true,
          changedRows: 0
        });

        return (0, _sql.all)('compoundKey');
      }).then(function (rows) {
        expect(rows).to.deep.equal([{ a: 'A', b: 'B' }]);
      });
    });

    it('should update row if exists by unique constraint', function () {
      return (0, _sql.insert)('defaultValue', { id: 'A', default: 'foo' }).then(function () {
        return write.save('defaultValue', { id: 'A', default: 'bar' });
      }).then(function () {
        return (0, _sql.all)('defaultValue');
      }).then(function (rows) {
        expect(rows).to.deep.equal([{ id: 'A', default: 'bar' }]);
      });
    });

    it('should handle empty array', function () {
      return write.save('key', []).then(function () {
        return (0, _sql.all)('key');
      }).then(function (rows) {
        expect(rows).to.have.lengthOf(0);
      });
    });

    it('should bulk save', function () {
      return (0, _sql.insert)('defaultValue', { id: 'A', default: 'foo' }).then(function () {
        return write.save('defaultValue', [{ id: 'A', default: 'bar' }, { id: 'B', default: 'baz' }]);
      }).then(function () {
        return (0, _sql.all)('defaultValue');
      }).then(function (rows) {
        expect(rows).to.have.lengthOf(2);
        expect(rows).to.have.same.deep.members([{ id: 'A', default: 'bar' }, { id: 'B', default: 'baz' }]);
      });
    });

    it('should bulk save with different length rows', function () {
      return (0, _sql.insert)('defaultValue', { id: 'A', default: 'foo' }).then(function () {
        return write.save('defaultValue', [{ id: 'A' }, { id: 'B', default: 'bar' }]);
      }).then(function () {
        return (0, _sql.all)('defaultValue');
      }).then(function (rows) {
        expect(rows).to.have.lengthOf(2);
        expect(rows).to.have.same.deep.members([{ id: 'A', default: 'foo' }, { id: 'B', default: 'bar' }]);
      });
    });

    it('should handle explicitly undefined value', function () {
      return write.save('defaultValue', {
        id: 'a',
        default: undefined
      }).then(function () {
        return (0, _sql.all)('defaultValue');
      }).then(function (rows) {
        expect(rows).to.deep.equal([{ id: 'a', default: 'DEFAULT' }]);
      });
    });
  });

  describe('replace', function () {
    it('should insert row if does not exist', function () {
      return write.replace('defaultValue', { id: 'A', default: 'foo' }).then(function (resp) {
        expect(JSON.parse(JSON.stringify(resp))).to.deep.equal({
          bulkWriteKey: 'default:id',
          fieldCount: 0,
          affectedRows: 1,
          insertId: 0,
          serverStatus: 2,
          warningCount: 0,
          message: '',
          protocol41: true,
          changedRows: 0
        });
        return (0, _sql.all)('defaultValue');
      }).then(function (rows) {
        expect(rows).to.deep.equal([{ id: 'A', default: 'foo' }]);
      });
    });

    it('should replace row with same unique key', function () {
      return write.replace('defaultValue', { id: 'A', default: 'foo' }).then(function () {
        return write.replace('defaultValue', { id: 'A', default: 'bar' });
      }).then(function () {
        return (0, _sql.all)('defaultValue');
      }).then(function (rows) {
        expect(rows).to.deep.equal([{ id: 'A', default: 'bar' }]);
      });
    });

    it('should handle empty array', function () {
      return write.replace('key', []).then(function () {
        return (0, _sql.all)('key');
      }).then(function (rows) {
        expect(rows).to.have.lengthOf(0);
      });
    });

    it('should bulk replace', function () {
      return (0, _sql.insert)('defaultValue', { id: 'A', default: 'foo' }).then(function () {
        return write.replace('defaultValue', [{ id: 'A', default: 'bar' }, { id: 'B', default: 'baz' }]);
      }).then(function () {
        return (0, _sql.all)('defaultValue');
      }).then(function (rows) {
        expect(rows).to.have.lengthOf(2);
        expect(rows).to.have.same.deep.members([{ id: 'A', default: 'bar' }, { id: 'B', default: 'baz' }]);
      });
    });

    it('should bulk save with different length rows', function () {
      return (0, _sql.insert)('defaultValue', { id: 'A', default: 'foo' }).then(function () {
        return write.replace('defaultValue', [{ id: 'A' }, { id: 'B', default: 'bar' }]);
      }).then(function () {
        return (0, _sql.all)('defaultValue');
      }).then(function (rows) {
        expect(rows).to.have.lengthOf(2);
        expect(rows).to.have.same.deep.members([{ id: 'A', default: 'DEFAULT' }, { id: 'B', default: 'bar' }]);
      });
    });

    it('should handle explicitly undefined', function () {
      return write.replace('defaultValue', {
        id: 'a',
        default: undefined
      }).then(function () {
        return (0, _sql.all)('defaultValue');
      }).then(function (rows) {
        expect(rows).to.deep.equal([{ id: 'a', default: 'DEFAULT' }]);
      });
    });
  });
});