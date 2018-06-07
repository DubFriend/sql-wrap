// @flow
/* eslint-disable no-unused-expressions */
declare var describe: any;
declare var it: any;
declare var beforeEach: any;

import _ from 'lodash';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { pool, all, clearAllTables, insert } from './sql';

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

    it('should have option to nest join', () =>
      Promise.all([
        insert('key', { id: 'A' }),
        insert('compoundKey', { a: 'A', b: 'B' }),
      ]).then(() =>
        query
          .rows({
            sql: `SELECT * FROM \`key\` k
              JOIN compoundKey ck
              ON k.id = ck.a`,
            nestTables: true,
          })
          .then(rows => {
            expect(rows).to.deep.equal([
              {
                k: { id: 'A' },
                ck: { a: 'A', b: 'B' },
              },
            ]);
          })
      ));

    it('should option to return resultCount', () =>
      insert('key', { id: 'A' })
        .then(() =>
          query.rows({ sql: 'SELECT * FROM `key`', resultCount: true })
        )
        .then(resp => {
          chai.assert.deepEqual(resp, {
            resultCount: 1,
            results: [{ id: 'A' }],
          });
        }));

    it('should have option to paginate', () =>
      Promise.all([insert('key', { id: 'A' }), insert('key', { id: 'B' })])
        .then(() =>
          query.rows({
            sql: 'SELECT * FROM `key` ORDER BY id',
            paginate: {
              page: 1,
              resultsPerPage: 1,
            },
          })
        )
        .then(resp => {
          expect(resp).to.deep.equal({
            results: [{ id: 'A' }],
            resultCount: 2,
            pageCount: 2,
            currentPage: 1,
          });
          return query.rows({
            sql: 'SELECT * FROM `key` ORDER BY id',
            paginate: {
              page: 2,
              resultsPerPage: 1,
            },
          });
        })
        .then(resp => {
          expect(resp).to.deep.equal({
            results: [{ id: 'B' }],
            resultCount: 2,
            pageCount: 2,
            currentPage: 2,
          });
        }));
  });

  describe('stream', () => {
    it('should stream found rows', done => {
      insert('key', { id: 'A' }).then(() => {
        const expectedStream = [{ id: 'A' }];
        const s = query.stream('SELECT * FROM `key`');
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
  });

  describe('build', () => {
    const toCursor = (r: Object, fields: string | Array<string>) =>
      new Buffer(
        _
          .map(Array.isArray(fields) ? fields : [fields], f => String(r[f]))
          .join('#')
      ).toString('base64');

    const cursorFig = od => ({
      cursor: _.extend({ orderBy: 'a' }, od),
    });

    const rowsToEdges = (rows: Array<Object>, fields: *) =>
      _.map(rows, r => ({
        node: r,
        cursor: toCursor(r, fields || ['a']),
      }));

    const a = { a: 'A', b: 'A' };
    const b = { a: 'B', b: 'B' };
    const c = { a: 'C', b: 'A' };

    beforeEach(() =>
      Promise.all([
        insert('compoundKey', a),
        insert('compoundKey', b),
        insert('compoundKey', c),
      ]));

    it('should have option to nest join', () =>
      clearAllTables()
        .then(() =>
          Promise.all([
            insert('key', { id: 'A' }),
            insert('compoundKey', { a: 'A', b: 'B' }),
          ])
        )
        .then(() =>
          query
            .build()
            .select()
            .from('`key`', 'k')
            .join('compoundKey', 'ck', 'k.id = ck.a')
            .run({ nestTables: true })
            .then(rows => {
              expect(rows).to.deep.equal([
                {
                  k: { id: 'A' },
                  ck: { a: 'A', b: 'B' },
                },
              ]);
            })
        ));

    it('should have option to paginate', () =>
      clearAllTables()
        .then(() =>
          Promise.all([insert('key', { id: 'A' }), insert('key', { id: 'B' })])
        )
        .then(() =>
          query
            .build()
            .select()
            .from('`key`')
            .order('id')
            .run({
              paginate: {
                page: 1,
                resultsPerPage: 1,
              },
            })
        )
        .then(resp => {
          expect(resp).to.deep.equal({
            results: [{ id: 'A' }],
            resultCount: 2,
            pageCount: 2,
            currentPage: 1,
          });
          return query
            .build()
            .select()
            .from('`key`')
            .order('id')
            .run({
              paginate: {
                page: 2,
                resultsPerPage: 1,
              },
            });
        })
        .then(resp => {
          expect(resp).to.deep.equal({
            results: [{ id: 'B' }],
            resultCount: 2,
            pageCount: 2,
            currentPage: 2,
          });
        }));

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
              startCursor: _.first(rowsToEdges([a, b, c])).cursor,
              endCursor: _.last(rowsToEdges([a, b, c])).cursor,
            },
            edges: rowsToEdges([a, b, c]),
          });
        }));

    it('should handle cursor with zero results', () =>
      query
        .build()
        .select()
        .from('compoundKey')
        .run(cursorFig({ first: 0 }))
        .then(resp => {
          expect(resp).to.deep.equal({
            resultCount: 3,
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: null,
              endCursor: null,
            },
            edges: [],
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
              startCursor: _.first(rowsToEdges([c, b, a])).cursor,
              endCursor: _.last(rowsToEdges([c, b, a])).cursor,
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
          const edges = _.map([a, b, c], r => ({
            node: r,
            cursor: toCursor({ a: r.a.toLowerCase() }, 'a'),
          }));
          expect(resp).to.deep.equal({
            resultCount: 3,
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: _.first(edges).cursor,
              endCursor: _.last(edges).cursor,
            },
            edges,
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
              startCursor: _.first(rowsToEdges([c])).cursor,
              endCursor: _.last(rowsToEdges([c])).cursor,
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
              startCursor: _.first(rowsToEdges([a])).cursor,
              endCursor: _.last(rowsToEdges([a])).cursor,
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
              startCursor: _.first(rowsToEdges([c])).cursor,
              endCursor: _.last(rowsToEdges([c])).cursor,
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
              startCursor: _.first(rowsToEdges([b, c])).cursor,
              endCursor: _.last(rowsToEdges([b, c])).cursor,
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
              startCursor: _.first(rowsToEdges([a, b])).cursor,
              endCursor: _.last(rowsToEdges([a, b])).cursor,
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
              startCursor: _.first(rowsToEdges([b])).cursor,
              endCursor: _.last(rowsToEdges([b])).cursor,
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
              startCursor: _.first(rowsToEdges([c])).cursor,
              endCursor: _.last(rowsToEdges([c])).cursor,
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
              startCursor: _.first(rowsToEdges([a])).cursor,
              endCursor: _.last(rowsToEdges([a])).cursor,
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
              startCursor: _.first(rowsToEdges([b])).cursor,
              endCursor: _.last(rowsToEdges([b])).cursor,
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
              startCursor: _.first(rowsToEdges([a, c, b], orderBy)).cursor,
              endCursor: _.last(rowsToEdges([a, c, b], orderBy)).cursor,
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
          const edges = rowsToEdges([c, a, b], _.map(orderBy, o => o.field));
          expect(resp).to.deep.equal({
            resultCount: 3,
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: _.first(edges).cursor,
              endCursor: _.last(edges).cursor,
            },
            edges,
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
              startCursor: _.first(rowsToEdges([c], orderBy)).cursor,
              endCursor: _.last(rowsToEdges([c], orderBy)).cursor,
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
          const edges = rowsToEdges([c, a], _.map(orderBy, o => o.field));
          expect(resp).to.deep.equal({
            resultCount: 2,
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: _.first(edges).cursor,
              endCursor: _.last(edges).cursor,
            },
            edges,
          });
        });
    });

    describe('whereIn', () => {
      it('should have a whereIn method', () =>
        query
          .build()
          .select()
          .from('compoundKey')
          .whereIn([{ a: 'A', b: 'A' }, { a: 'B', b: 'B' }])
          .run()
          .then(resp => {
            expect(resp).to.have.lengthOf(2);
            expect(resp).to.have.deep.members([a, b]);
          }));

      it('should handle single element', () =>
        query
          .build()
          .select()
          .from('compoundKey')
          .whereIn([{ a: 'A', b: 'A' }])
          .run()
          .then(resp => {
            expect(resp).to.have.lengthOf(1);
            expect(resp).to.have.deep.members([a]);
          }));

      it('should handle on empty array', () =>
        query
          .build()
          .select()
          .from('compoundKey')
          .whereIn([])
          .run()
          .then(resp => {
            expect(resp).to.deep.equal([]);
          }));
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

    it('should option to return resultCount', () =>
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
