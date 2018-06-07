// @flow
declare var describe: any;
declare var it: any;
declare var before: any;

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { pool, clearAllTables, insert } from './sql';

chai.use(chaiAsPromised);
const { expect } = chai;

const read = require('../read')({ driver: pool, sqlType: 'mysql' });

describe('read.unit', () => {
  before(() =>
    clearAllTables().then(() =>
      Promise.all([
        insert('key', { id: 'A' }),
        insert('key', { id: 'B' }),
        insert('compoundKey', { a: 'A', b: 'B' }),
      ])
    )
  );

  describe('select', () => {
    it('should select based on where object', () =>
      read.select('key', { id: 'A' }).then(rows => {
        expect(rows).to.deep.equal([{ id: 'A' }]);
      }));

    it('should support options object', () =>
      read
        .select({
          table: 'key',
          where: { id: 'A' },
        })
        .then(rows => {
          expect(rows).to.deep.equal([{ id: 'A' }]);
        }));

    it('should have option to choose fields', () =>
      read
        .select({
          table: 'compoundKey',
          fields: ['b'],
          where: { a: 'A' },
        })
        .then(rows => {
          expect(rows).to.deep.equal([{ b: 'B' }]);
        }));
  });

  describe('stream', () => {
    it('should return readable stream or results', done => {
      const s = read.stream({ table: 'compoundKey' });
      const expectedStream = [{ a: 'A', b: 'B' }];
      s.on('error', done);
      s.on('data', row => {
        expect(row).to.deep.equal(expectedStream.shift());
      });
      s.on('end', () => {
        expect(expectedStream).to.have.lengthOf(0);
        done();
      });
    });
  });

  describe('selectOne', () => {
    it('should get a single row', () =>
      read.selectOne('key', { id: 'A' }).then(row => {
        expect(row).to.deep.equal({ id: 'A' });
      }));
  });
});
