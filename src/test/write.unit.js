// @flow
/* eslint-disable no-unused-expressions */
declare var describe: any;
declare var it: any;
declare var beforeEach: any;

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { pool, all, clearAllTables, insert } from './sql';
import TemplatedValue from '../templated-value';

chai.use(chaiAsPromised);
const { expect } = chai;

const write = require('../write')({ driver: pool, sqlType: 'mysql' });

describe('write.unit', () => {
  beforeEach(clearAllTables);

  describe('insert', () => {
    it('should handle explicitly undefined column', () =>
      write
        .insert('defaultValue', { id: 'a', default: undefined })
        .then(() => all('defaultValue'))
        .then(rows => {
          expect(rows).to.deep.equal([{ id: 'a', default: 'DEFAULT' }]);
        }));

    it('should create a new database row', () =>
      write
        .insert('key', { id: 'A' })
        .then(resp => {
          expect(JSON.parse(JSON.stringify(resp))).to.deep.equal({
            bulkWriteKey: '`id`',
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

    it('should handle empty array', () =>
      write
        .insert('key', [])
        .then(() => all('key'))
        .then(rows => {
          expect(rows).to.have.lengthOf(0);
        }));

    it('should bulk insert', () =>
      write
        .insert('key', [{ id: 'A' }, { id: 'B' }])
        .then(() => all('key'))
        .then(rows => {
          expect(rows).to.have.same.deep.members([{ id: 'A' }, { id: 'B' }]);
        }));

    it('should bulk insert with different length rows', () =>
      write
        .insert('defaultValue', [{ id: 'A' }, { id: 'B', default: 'bar' }])
        .then(() => all('defaultValue'))
        .then(rows => {
          expect(rows).to.have.lengthOf(2);
          expect(rows).to.have.same.deep.members([
            { id: 'A', default: 'DEFAULT' },
            { id: 'B', default: 'bar' },
          ]);
        }));

    it('should handle Date object as insert value', () =>
      write
        .insert('timestamp', { id: new Date(2000000000) })
        .then(() => all('timestamp'))
        .then(rows => {
          expect(rows).to.deep.equal([{ id: new Date(2000000000) }]);
        }));

    it('should allow mysql functions in values', () =>
      write
        .insert('defaultValue', {
          id: 'a',
          default: new TemplatedValue('CONCAT(?, ?)', 'a', 'b'),
        })
        .then(() => all('defaultValue'))
        .then(rows => {
          expect(rows).to.deep.equal([{ id: 'a', default: 'ab' }]);
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

    it('should handle explicitly undefined column', () =>
      write.update('defaultValue', { id: 'a', default: undefined }));

    it('should handle bulk updates', () =>
      Promise.all([
        insert('compoundKey', { a: 'A', b: 'B' }),
        insert('compoundKey', { a: 'M', b: 'N' }),
      ])
        .then(() =>
          write.update('compoundKey', [
            { update: { b: 'C' }, where: { a: 'A' } },
            { update: { b: 'O' }, where: { a: 'M' } },
          ])
        )
        .then(() => all('compoundKey'))
        .then(rows => {
          expect(rows).to.have.same.deep.members([
            { a: 'A', b: 'C' },
            { a: 'M', b: 'O' },
          ]);
        }));

    it('should handle where in', () =>
      Promise.all([
        insert('compoundKey', { a: 'A', b: 'B' }),
        insert('compoundKey', { a: 'M', b: 'N' }),
        insert('compoundKey', { a: 'J', b: 'P' }),
      ])
        .then(() => write.update('compoundKey', { b: 'C' }, { a: ['A', 'M'] }))
        .then(() => all('compoundKey'))
        .then(rows => {
          expect(rows).to.have.same.deep.members([
            { a: 'A', b: 'C' },
            { a: 'M', b: 'C' },
            { a: 'J', b: 'P' },
          ]);
        }));

    it('should handle multiple where conditions', () =>
      Promise.all([
        insert('compoundKey', { a: 'A', b: 'B' }),
        insert('compoundKey', { a: 'M', b: 'B' }),
      ])
        .then(() => write.update('compoundKey', { b: 'C' }, { a: 'A', b: 'B' }))
        .then(() => all('compoundKey'))
        .then(rows => {
          expect(rows).to.have.same.deep.members([
            { a: 'A', b: 'C' },
            { a: 'M', b: 'B' },
          ]);
        }));

    it('should handle empty array', () => write.update('compoundKey', []));

    it('should allow mysql functions in values', () =>
      insert('defaultValue', { id: 'a', default: 'foo' })
        .then(() =>
          write.update('defaultValue', {
            id: 'a',
            default: new TemplatedValue('CONCAT(?, ?)', 'a', 'b'),
          })
        )
        .then(() => all('defaultValue'))
        .then(rows => {
          expect(rows).to.deep.equal([{ id: 'a', default: 'ab' }]);
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
        .save('compoundKey', { b: 'B', a: 'A' })
        .then(resp => {
          expect(JSON.parse(JSON.stringify(resp))).to.deep.equal({
            bulkWriteKey: '`a`:`b`',
            fieldCount: 0,
            affectedRows: 1,
            insertId: 0,
            serverStatus: 2,
            warningCount: 0,
            message: '',
            protocol41: true,
            changedRows: 0,
          });

          return all('compoundKey');
        })
        .then(rows => {
          expect(rows).to.deep.equal([{ a: 'A', b: 'B' }]);
        }));

    it('should update row if exists by unique constraint', () =>
      insert('defaultValue', { id: 'A', default: 'foo' })
        .then(() => write.save('defaultValue', { id: 'A', default: 'bar' }))
        .then(() => all('defaultValue'))
        .then(rows => {
          expect(rows).to.deep.equal([{ id: 'A', default: 'bar' }]);
        }));

    it('should handle empty array', () =>
      write
        .save('key', [])
        .then(() => all('key'))
        .then(rows => {
          expect(rows).to.have.lengthOf(0);
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

    it('should bulk save with different length rows', () =>
      insert('defaultValue', { id: 'A', default: 'foo' })
        .then(() =>
          write.save('defaultValue', [{ id: 'A' }, { id: 'B', default: 'bar' }])
        )
        .then(() => all('defaultValue'))
        .then(rows => {
          expect(rows).to.have.lengthOf(2);
          expect(rows).to.have.same.deep.members([
            { id: 'A', default: 'foo' },
            { id: 'B', default: 'bar' },
          ]);
        }));

    it('should handle explicitly undefined value', () =>
      write
        .save('defaultValue', {
          id: 'a',
          default: undefined,
        })
        .then(() => all('defaultValue'))
        .then(rows => {
          expect(rows).to.deep.equal([{ id: 'a', default: 'DEFAULT' }]);
        }));

    it('should allow mysql functions in values', () =>
      insert('defaultValue', { id: 'A', default: 'foo' })
        .then(() =>
          write.save('defaultValue', {
            id: 'a',
            default: new TemplatedValue('CONCAT(?, ?)', 'a', 'b'),
          })
        )
        .then(() => all('defaultValue'))
        .then(rows => {
          expect(rows).to.deep.equal([{ id: 'a', default: 'ab' }]);
        }));
  });

  describe('replace', () => {
    it('should insert row if does not exist', () =>
      write
        .replace('defaultValue', { id: 'A', default: 'foo' })
        .then(resp => {
          expect(JSON.parse(JSON.stringify(resp))).to.deep.equal({
            bulkWriteKey: '`default`:`id`',
            fieldCount: 0,
            affectedRows: 1,
            insertId: 0,
            serverStatus: 2,
            warningCount: 0,
            message: '',
            protocol41: true,
            changedRows: 0,
          });
          return all('defaultValue');
        })
        .then(rows => {
          expect(rows).to.deep.equal([{ id: 'A', default: 'foo' }]);
        }));

    it('should replace row with same unique key', () =>
      write
        .replace('defaultValue', { id: 'A', default: 'foo' })
        .then(() => write.replace('defaultValue', { id: 'A', default: 'bar' }))
        .then(() => all('defaultValue'))
        .then(rows => {
          expect(rows).to.deep.equal([{ id: 'A', default: 'bar' }]);
        }));

    it('should handle empty array', () =>
      write
        .replace('key', [])
        .then(() => all('key'))
        .then(rows => {
          expect(rows).to.have.lengthOf(0);
        }));

    it('should bulk replace', () =>
      insert('defaultValue', { id: 'A', default: 'foo' })
        .then(() =>
          write.replace('defaultValue', [
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

    it('should bulk save with different length rows', () =>
      insert('defaultValue', { id: 'A', default: 'foo' })
        .then(() =>
          write.replace('defaultValue', [
            { id: 'A' },
            { id: 'B', default: 'bar' },
          ])
        )
        .then(() => all('defaultValue'))
        .then(rows => {
          expect(rows).to.have.lengthOf(2);
          expect(rows).to.have.same.deep.members([
            { id: 'A', default: 'DEFAULT' },
            { id: 'B', default: 'bar' },
          ]);
        }));

    it('should handle explicitly undefined', () =>
      write
        .replace('defaultValue', { id: 'a', default: undefined })
        .then(() => all('defaultValue'))
        .then(rows => {
          expect(rows).to.deep.equal([{ id: 'a', default: 'DEFAULT' }]);
        }));

    it('should allow mysql functions in values', () =>
      write
        .replace('defaultValue', {
          id: 'a',
          default: new TemplatedValue('CONCAT(?, ?)', 'a', 'b'),
        })
        .then(() => all('defaultValue'))
        .then(rows => {
          expect(rows).to.deep.equal([{ id: 'a', default: 'ab' }]);
        }));
  });
});
