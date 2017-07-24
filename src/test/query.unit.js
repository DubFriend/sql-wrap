// @flow
/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import Promise from 'bluebird';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { pool, truncateTable, all, clearAllTables, insert } from './sql';

chai.use(chaiAsPromised);
const { expect } = chai;

const query = require('../query')({ driver: pool, sqlType: 'mysql' });

describe('query', () => {
  beforeEach(clearAllTables);

  describe('row', () => {
    it('should return single row', () =>
      insert('autoInc', { id: 1 })
        .then(() => query.row('SELECT * FROM autoInc'))
        .then(rows => {
          expect(rows).to.deep.equal({ id: 1 });
        }));
  });

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

  describe('build', () => {
    const rowsToEdges = (rows: Array<Object>, fields: *) =>
      _.map(rows, r => ({
        node: r,
        cursor: toCursor(r, fields || ['a']),
      }));

    const toCursor = (r: Object, fields: string | Array<string>) =>
      new Buffer(
        _.map(Array.isArray(fields) ? fields : [fields], f =>
          String(r[f])
        ).join('#')
      ).toString('base64');

    const cursorFig = od => ({
      cursor: _.extend({ orderBy: 'a' }, od),
    });

    const a = { a: 'A', b: 'A' };
    const b = { a: 'B', b: 'B' };
    const c = { a: 'C', b: 'A' };

    beforeEach(() =>
      Promise.all([
        insert('compoundKey', a),
        insert('compoundKey', b),
        insert('compoundKey', c),
      ])
    );

    it('should have cursor option', () =>
      query
        .build()
        .select()
        .from('compoundKey')
        .run(cursorFig({ first: 100 }))
        .then(resp => {
          expect(resp).to.deep.equal({
            resultCount: 3,
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
            },
            edges: rowsToEdges([a, b, c]),
          });
        }));

    it('should handle orderBy with direction', () =>
      query
        .build()
        .select()
        .from('compoundKey')
        .run(
          cursorFig({
            first: 100,
            orderBy: { field: 'a', direction: 'DESC' },
          })
        )
        .then(resp => {
          expect(resp).to.deep.equal({
            resultCount: 3,
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
            },
            edges: rowsToEdges([c, b, a]),
          });
        }));

    it('should handle orderBy with serialization', () =>
      query
        .build()
        .select()
        .from('compoundKey')
        .run(
          cursorFig({
            first: 100,
            orderBy: {
              field: 'a',
              serialize: v => v.toLowerCase(),
            },
          })
        )
        .then(resp => {
          expect(resp).to.deep.equal({
            resultCount: 3,
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
            },
            edges: _.map([a, b, c], r => ({
              node: r,
              cursor: toCursor({ a: r.a.toLowerCase() }, 'a'),
            })),
          });
        }));

    it('should handle orderBy with deserialization', () =>
      query
        .build()
        .select()
        .from('compoundKey')
        .run(
          cursorFig({
            first: 100,
            after: toCursor({ a: b.a.toLowerCase() }, 'a'),
            orderBy: {
              field: 'a',
              deserialize: v => v.toLowerCase(),
            },
          })
        )
        .then(resp => {
          expect(resp).to.deep.equal({
            resultCount: 1,
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
            },
            edges: rowsToEdges([c]),
          });
        }));

    it('should limit with "first" field', () =>
      query
        .build()
        .select()
        .from('compoundKey')
        .run(cursorFig({ first: 1 }))
        .then(resp => {
          expect(resp).to.deep.equal({
            resultCount: 3,
            pageInfo: {
              hasNextPage: true,
              hasPreviousPage: false,
            },
            edges: rowsToEdges([a]),
          });
        }));

    it('should limit with the "last" field', () =>
      query
        .build()
        .select()
        .from('compoundKey')
        .run(cursorFig({ last: 1 }))
        .then(resp => {
          expect(resp).to.deep.equal({
            resultCount: 3,
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: true,
            },
            edges: rowsToEdges([c]),
          });
        }));

    it('should enable next page selection with the "after" field', () =>
      query
        .build()
        .select()
        .from('compoundKey')
        .run(cursorFig({ first: 100, after: toCursor(a, 'a') }))
        .then(resp => {
          expect(resp).to.deep.equal({
            resultCount: 2,
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
            },
            edges: rowsToEdges([b, c]),
          });
        }));

    it('should enable previous page selection with the "before" field', () =>
      query
        .build()
        .select()
        .from('compoundKey')
        .run(cursorFig({ last: 100, before: toCursor(c, 'a') }))
        .then(resp => {
          expect(resp).to.deep.equal({
            resultCount: 2,
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
            },
            edges: rowsToEdges([a, b]),
          });
        }));

    it('should limit with "first" and "after"', () =>
      query
        .build()
        .select()
        .from('compoundKey')
        .run(
          cursorFig({
            first: 1,
            after: toCursor(a, 'a'),
          })
        )
        .then(resp => {
          expect(resp).to.deep.equal({
            resultCount: 2,
            pageInfo: {
              hasNextPage: true,
              hasPreviousPage: false,
            },
            edges: rowsToEdges([b]),
          });
        }));

    it('should limit with "last" and "after"', () =>
      query
        .build()
        .select()
        .from('compoundKey')
        .run(cursorFig({ last: 1, after: toCursor(a, 'a') }))
        .then(resp => {
          expect(resp).to.deep.equal({
            resultCount: 2,
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: true,
            },
            edges: rowsToEdges([c]),
          });
        }));

    it('should limit with "first" and "before"', () =>
      query
        .build()
        .select()
        .from('compoundKey')
        .run(cursorFig({ first: 1, before: toCursor(c, 'a') }))
        .then(resp => {
          expect(resp).to.deep.equal({
            resultCount: 2,
            pageInfo: {
              hasNextPage: true,
              hasPreviousPage: false,
            },
            edges: rowsToEdges([a]),
          });
        }));

    it('should limit with "last" and "before"', () =>
      query
        .build()
        .select()
        .from('compoundKey')
        .run(cursorFig({ last: 1, before: toCursor(c, 'a') }))
        .then(resp => {
          expect(resp).to.deep.equal({
            resultCount: 2,
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: true,
            },
            edges: rowsToEdges([b]),
          });
        }));

    it('should handle compound orderBy', () => {
      const orderBy = ['b', 'a'];
      return query
        .build()
        .select()
        .from('compoundKey')
        .run(cursorFig({ orderBy: orderBy, first: 100 }))
        .then(resp => {
          expect(resp).to.deep.equal({
            resultCount: 3,
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
            },
            edges: rowsToEdges([a, c, b], orderBy),
          });
        });
    });

    it('should handle compound orderBy with direction', () => {
      const orderBy = [{ field: 'b' }, { field: 'a', direction: 'DESC' }];

      return query
        .build()
        .select()
        .from('compoundKey')
        .run(cursorFig({ orderBy: orderBy, first: 100 }))
        .then(resp => {
          expect(resp).to.deep.equal({
            resultCount: 3,
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
            },
            edges: rowsToEdges([c, a, b], _.map(orderBy, o => o.field)),
          });
        });
    });

    it('should handle compound orderBy with complex fig', () => {
      const orderBy = ['b', 'a'];
      return query
        .build()
        .select()
        .from('compoundKey')
        .run(
          cursorFig({
            orderBy,
            first: 2,
            before: toCursor(b, orderBy),
            after: toCursor(a, orderBy),
          })
        )
        .then(resp => {
          expect(resp).to.deep.equal({
            resultCount: 1,
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
            },
            edges: rowsToEdges([c], orderBy),
          });
        });
    });

    it('should handle compound orderBy with complex fig with direction', () => {
      const orderBy = [{ field: 'b' }, { field: 'a', direction: 'DESC' }];
      return query
        .build()
        .select()
        .from('compoundKey')
        .run(
          cursorFig({
            orderBy: orderBy,
            first: 2,
            before: toCursor(b, _.map(orderBy, o => o.field)),
          })
        )
        .then(resp => {
          expect(resp).to.deep.equal({
            resultCount: 2,
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
            },
            edges: rowsToEdges([c, a], _.map(orderBy, o => o.field)),
          });
        });
    });

    it('should have whereIfDefined method', () =>
      query
        .build()
        .select()
        .from('compoundKey')
        .whereIfDefined('a = ?', undefined)
        .run()
        .then(resp => {
          expect(resp).to.have.deep.members([a, b, c]);
          return query
            .build()
            .select()
            .from('compoundKey')
            .whereIfDefined('a = ?', 'Z')
            .run();
        })
        .then(resp => {
          expect(resp).to.deep.equal([]);
        }));

    it('should return query generator', () =>
      query
        .build()
        .select()
        .from('compoundKey')
        .where('a = ?', c.a)
        .run()
        .then(resp => {
          chai.assert.deepEqual(resp, [c]);
        }));

    it('should be able to pass query options through "run" command', () =>
      query
        .build()
        .select()
        .from('compoundKey')
        .where('a = ?', c.a)
        .run({ resultCount: true })
        .then(resp => {
          chai.assert.deepEqual(resp, {
            resultCount: 1,
            results: [c],
          });
        }));

    it('should be invokable through a "one" command', () =>
      query
        .build()
        .select()
        .from('compoundKey')
        .where('a = ?', c.a)
        .one()
        .then(resp => {
          chai.assert.deepEqual(resp, c);
        }));
  });
});
