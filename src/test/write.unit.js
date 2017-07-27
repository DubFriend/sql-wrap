// @flow
/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import Promise from 'bluebird';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { pool, truncateTable, all, clearAllTables, insert } from './sql';

chai.use(chaiAsPromised);
const { expect } = chai;

const write = require('../write')({ driver: pool, sqlType: 'mysql' });

describe('write.unit', () => {
  beforeEach(clearAllTables);

  describe('insert', () => {
    it('should create a new database row', () =>
      write
        .insert('key', { id: 'A' })
        .then(resp => {
          expect(JSON.parse(JSON.stringify(resp))).to.deep.equal({
            fieldCount: 0,
            affectedRows: 1,
            insertId: 0,
            serverStatus: 2,
            warningCount: 0,
            message: '',
            protocol41: true,
            changedRows: 0,
          });
          return all('key');
        })
        .then(rows => {
          expect(rows).to.deep.equal([{ id: 'A' }]);
        }));

    it('should bulk insert', () =>
      write
        .insert('key', [{ id: 'A' }, { id: 'B' }])
        .then(() => all('key'))
        .then(rows => {
          expect(rows).to.have.same.deep.members([{ id: 'A' }, { id: 'B' }]);
        }));

    it('should handle empty array', () =>
      write.insert('key', []).then(() => all('key')).then(rows => {
        expect(rows).to.have.lengthOf(0);
      }));
  });

  describe('update', () => {
    it('should update row according to where equals object', () =>
      Promise.all([
        insert('compoundKey', { a: 'A', b: 'B' }),
        insert('compoundKey', { a: 'M', b: 'N' }),
      ])
        .then(() => write.update('compoundKey', { b: 'C' }, { a: 'A' }))
        .then(() => all('compoundKey'))
        .then(rows => {
          expect(rows).to.have.same.deep.members([
            { a: 'A', b: 'C' },
            { a: 'M', b: 'N' },
          ]);
        }));
  });

  describe('delete', () => {
    it('should delete row according to where equals object', () =>
      Promise.all([insert('key', { id: 'A' }), insert('key', { id: 'B' })])
        .then(() => write.delete('key', { id: 'A' }))
        .then(() => all('key'))
        .then(rows => {
          expect(rows).to.deep.equal([{ id: 'B' }]);
        }));
  });

  describe('save', () => {
    it('should insert row if does not exist', () =>
      write
        .save('key', { id: 'A' })
        .then(resp => {
          expect(JSON.parse(JSON.stringify(resp))).to.deep.equal({
            fieldCount: 0,
            affectedRows: 1,
            insertId: 0,
            serverStatus: 2,
            warningCount: 0,
            message: '',
            protocol41: true,
            changedRows: 0,
          });

          return all('key');
        })
        .then(rows => {
          expect(rows).to.deep.equal([{ id: 'A' }]);
        }));

    it('should update row if exists by unique constraint', () =>
      insert('defaultValue', { id: 'A', default: 'foo' })
        .then(() => write.save('defaultValue', { id: 'A', default: 'bar' }))
        .then(() => all('defaultValue'))
        .then(rows => {
          expect(rows).to.deep.equal([{ id: 'A', default: 'bar' }]);
        }));

    it('should bulk save', () =>
      insert('defaultValue', { id: 'A', default: 'foo' })
        .then(() =>
          write.save('defaultValue', [
            { id: 'A', default: 'bar' },
            { id: 'B', default: 'baz' },
          ])
        )
        .then(() => all('defaultValue'))
        .then(rows => {
          expect(rows).to.have.lengthOf(2);
          expect(rows).to.have.same.deep.members([
            { id: 'A', default: 'bar' },
            { id: 'B', default: 'baz' },
          ]);
        }));

    it('should handle empty array', () =>
      write.save('key', []).then(() => all('key')).then(rows => {
        expect(rows).to.have.lengthOf(0);
      }));
  });
});