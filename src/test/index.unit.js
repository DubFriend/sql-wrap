// @flow
/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import Promise from 'bluebird';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import { pool, truncateTable, all, clearAllTables, insert } from './sql';
import stream from 'stream';

chai.use(chaiAsPromised);
const { expect } = chai;

const index = require('../index')({ driver: pool, sqlType: 'mysql' });

describe('index.unit', () => {
  const stub = {};

  beforeEach(clearAllTables);

  afterEach(() => {
    _.each(stub, s => s.restore());
  });

  describe('connection', () => {
    it('should get an instance of sqlWrap for a single connection', () =>
      index.connection().then(conn => {
        expect(conn).to.have.include.keys(
          'connection',
          'query',
          'select',
          'stream',
          'streamTable'
        );
      }));
  });

  describe('query', () => {
    it('should return array of rows', () =>
      index.query('SELECT * FROM `key`').then(rows => {
        expect(rows).to.deep.equal([]);
      }));
  });

  describe('one', () => {
    it('should return row or null', () =>
      index.one('SELECT * FROM `key`').then(row => {
        expect(row).to.be.null;
      }));
  });

  describe('select', () => {
    it('should return rows', () =>
      index.select('key').then(rows => {
        expect(rows).to.deep.equal([]);
      }));
  });

  describe('selectOne', () => {
    it('should return row or null', () =>
      index.selectOne('key').then(row => {
        expect(row).to.be.null;
      }));
  });

  describe('stream', () => {
    it('should return results stream', () => {
      expect(index.stream('SELECT * FROM `key`')).to.be.instanceof(stream);
    });
  });

  describe('streamTable', () => {
    it('should return results stream', () => {
      expect(index.streamTable('key')).to.be.instanceof(stream);
    });
  });

  describe('selectStream', () => {
    it('should promise a results stream', () =>
      index.selectStream('key').then(s => {
        expect(s).to.be.instanceof(stream);
      }));
  });

  describe('insert', () => {
    it('should insert row', () =>
      index.insert('key', { id: 'a' }).then(() => all('key')).then(rows => {
        expect(rows).to.deep.equal([{ id: 'a' }]);
      }));
  });

  describe('replace', () => {
    it('should replace row', () =>
      index.replace('key', { id: 'a' }).then(() => all('key')).then(rows => {
        expect(rows).to.deep.equal([{ id: 'a' }]);
      }));
  });

  describe('save', () => {
    it('should save row', () =>
      index.save('key', { id: 'a' }).then(() => all('key')).then(rows => {
        expect(rows).to.deep.equal([{ id: 'a' }]);
      }));
  });

  describe('update', () => {
    it('should update row', () =>
      insert('compoundKey', { a: 'a', b: 'b' })
        .then(() => index.update('compoundKey', { b: 'c' }))
        .then(() => all('compoundKey'))
        .then(rows => {
          expect(rows).to.deep.equal([{ a: 'a', b: 'c' }]);
        }));
  });

  describe('delete', () => {
    it('should delete row', () =>
      insert('key', { id: 'a' })
        .then(() => index.delete('key'))
        .then(() => all('key'))
        .then(rows => {
          expect(rows).to.have.lengthOf(0);
        }));
  });

  describe('build', () => {
    it('should return query builder', () =>
      index
        .build()
        .insert()
        .into('`key`')
        .setFields({ id: 'a' })
        .run()
        .then(() => all('key'))
        .then(rows => {
          expect(rows).to.deep.equal([{ id: 'a' }]);
        }));
  });

  describe('escape', () => {
    it('should escape value', () => {
      expect(index.escape(null)).to.equal('NULL');
    });
  });

  describe('escapeId', () => {
    it('should escape id', () => {
      expect(index.escapeId('foo')).to.equal('`foo`');
    });
  });
});
