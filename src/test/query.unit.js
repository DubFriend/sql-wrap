// @flow
/* eslint-disable no-unused-expressions */
import chai from 'chai';
import Promise from 'bluebird';
import chaiAsPromised from 'chai-as-promised';
import { pool, truncateTable, all, clearAllTables, insert } from './sql';

chai.use(chaiAsPromised);
const { expect } = chai;

const query = require('../query')({ connectionPool: pool });

describe('query', () => {
  beforeEach(clearAllTables);

  describe('rows', () => {
    it('should execute basic insert query', () =>
      query.rows('INSERT INTO `key` (id) VALUES (?)', ['a']).then(resp => {
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
      }));

    it('should return insertId on autoInc query', () =>
      query.rows('INSERT INTO autoInc (id) VALUES(?)', [1]).then(resp => {
        expect(JSON.parse(JSON.stringify(resp))).to.deep.equal({
          fieldCount: 0,
          affectedRows: 1,
          insertId: 1,
          serverStatus: 2,
          warningCount: 0,
          message: '',
          protocol41: true,
          changedRows: 0,
        });
      }));

    it('should return array of rows on select', () =>
      insert('autoInc', { id: 1 })
        .then(() => query.rows('SELECT * FROM autoInc'))
        .then(rows => {
          expect(rows).to.deep.equal([{ id: 1 }]);
        }));

    it('should perform update', () =>
      insert('key', { id: 'A' })
        .then(() => query.rows('UPDATE ?? SET id=?', ['key', 'B']))
        .then(resp => {
          expect(JSON.parse(JSON.stringify(resp))).to.deep.equal({
            fieldCount: 0,
            affectedRows: 1,
            insertId: 0,
            serverStatus: 34,
            warningCount: 0,
            message: '(Rows matched: 1  Changed: 1  Warnings: 0',
            protocol41: true,
            changedRows: 1,
          });
        })
        .then(() => all('key'))
        .then(rows => {
          expect(rows).to.deep.equal([{ id: 'B' }]);
        }));

    it('should perform delete', () =>
      insert('key', { id: 'A' })
        .then(() => query.rows('DELETE FROM ??', ['key']))
        .then(resp => {
          expect(JSON.parse(JSON.stringify(resp))).to.deep.equal({
            fieldCount: 0,
            affectedRows: 1,
            insertId: 0,
            serverStatus: 34,
            warningCount: 0,
            message: '',
            protocol41: true,
            changedRows: 0,
          });
        })
        .then(() => all('key'))
        .then(rows => {
          expect(rows).to.deep.equal([]);
        }));
  });
});
