'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _squel = require('squel');

var _squel2 = _interopRequireDefault(_squel);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var CURSOR_DELIMETER = '#';

var mapOrderBy = function mapOrderBy(raw) {
  return _lodash2.default.map(Array.isArray(raw) ? raw : [raw], function (o) {
    return typeof o === 'string' ? {
      field: o,
      isAscending: true,
      serialize: function serialize(v) {
        return v;
      },
      deserialize: function deserialize(v) {
        return v;
      }
    } : _lodash2.default.chain(o).omit('direction').clone().extend({
      isAscending: o.direction === 'DESC' ? false : true,
      serialize: o.serialize || function (v) {
        return v;
      },
      deserialize: o.deserialize || function (v) {
        return v;
      }
    }).value();
  });
};

var resolveRowsConfig = function resolveRowsConfig(textOrConfig, values) {
  var config = {};

  if (typeof textOrConfig === 'string') {
    config.sql = textOrConfig;
  } else {
    config.sql = textOrConfig.sql;
    config.nestTables = textOrConfig.nestTables;
    config.paginate = textOrConfig.paginate;
    config.resultCount = textOrConfig.resultCount;
    config.values = textOrConfig.values;
  }

  if (values) {
    config.values = values;
  }

  return config;
};

module.exports = function (_ref) {
  var driver = _ref.driver,
      sqlType = _ref.sqlType;

  var self = {};

  var getConnection = function getConnection() {
    var connectionPromise = typeof driver.getConnection === 'function' ? driver.getConnection() : _bluebird2.default.resolve(driver);

    return connectionPromise;
  };

  var connectionDone = function connectionDone(connection) {
    if (typeof connection.release === 'function') {
      connection.release();
    }
  };

  var stripLimit = function stripLimit(sql) {
    return sql.replace(/ LIMIT .*/i, '');
  };

  var runCursor = function runCursor(q, fig) {
    var orderBy = mapOrderBy(fig.orderBy);
    var isAscending = fig.last && !fig.first ? false : true;

    var decodeCursor = function decodeCursor(c) {
      return _lodash2.default.map(new Buffer(c, 'base64').toString('ascii').split(CURSOR_DELIMETER), function (v, i) {
        return orderBy[i].deserialize(v);
      });
    };

    var buildWhereArgs = function buildWhereArgs(values, isGreaterThan) {
      var build = function build(values, orderBy, isGreaterThan) {
        var sql = _lodash2.default.map(orderBy, function (o, i) {
          return i === values.length - 1 ? o.field + ' ' + ((o.isAscending ? isGreaterThan : !isGreaterThan) ? '>' : '<') + ' ?' : o.field + ' = ?';
        }).join(' AND ');

        var sqls = [sql];
        var mappedValues = [values];

        if (values.length > 1) {
          var _w = build(_lodash2.default.initial(values), _lodash2.default.initial(orderBy), isGreaterThan);
          sqls = sqls.concat(_w.sqls);
          mappedValues = mappedValues.concat(_w.mappedValues);
        }

        return { sqls: sqls, mappedValues: mappedValues };
      };

      var w = build(values, orderBy, isGreaterThan);

      return [w.sqls.reverse().join(' OR ')].concat(_lodash2.default.flatten(w.mappedValues.reverse()));
    };

    _lodash2.default.each(orderBy, function (o) {
      q.order(o.field, o.isAscending ? isAscending : !isAscending);
    });

    if (fig.after) {
      q.where.apply(q, buildWhereArgs(decodeCursor(fig.after), true));
    }

    if (fig.before) {
      q.where.apply(q, buildWhereArgs(decodeCursor(fig.before), false));
    }

    q.limit(isAscending ? fig.first : fig.last);

    var _q$toParam = q.toParam(),
        text = _q$toParam.text,
        values = _q$toParam.values;

    return self.rows({
      sql: text,
      values: values,
      resultCount: true
    }).then(function (resp) {
      if (_typeof(resp.results) === 'object' && Array.isArray(resp.results) && typeof resp.resultCount === 'number') {
        var r = {};
        r.resultCount = resp.resultCount;
        if (isAscending && fig.last && fig.last < resp.results.length) {
          r.results = resp.results.slice(resp.results.length - fig.last, resp.results.length);
        } else if (!isAscending && fig.last && fig.last < resp.results.length) {
          r.results = resp.results.slice(0, fig.last);
        } else {
          r.results = resp.results;
        }

        if (!isAscending) {
          r.results = resp.results.reverse();
        }
        return r;
      } else {
        return _bluebird2.default.reject(new Error("this shouldn't happen"));
      }
    }).then(function (resp) {
      return {
        resultCount: resp.resultCount,
        pageInfo: {
          hasPreviousPage: fig.last ? resp.resultCount > fig.last : false,
          hasNextPage: fig.first ? resp.resultCount > fig.first : false
        },
        edges: _lodash2.default.map(resp.results, function (r) {
          return {
            node: r,
            cursor: encodeCursor(orderBy, r)
          };
        })
      };
    });
  };

  var encodeCursor = function encodeCursor(orderBy, row) {
    return new Buffer(_lodash2.default.map(orderBy, function (o) {
      return o.serialize ? o.serialize(row[o.field]) : String(row[o.field]);
    }).join(CURSOR_DELIMETER)).toString('base64');
  };

  self.encodeCursor = function (orderByRaw, row) {
    return encodeCursor(mapOrderBy(orderByRaw), row);
  };

  self.rows = function (textOrConfig, maybeValues) {
    var _resolveRowsConfig = resolveRowsConfig(textOrConfig, maybeValues),
        sql = _resolveRowsConfig.sql,
        nestTables = _resolveRowsConfig.nestTables,
        paginate = _resolveRowsConfig.paginate,
        resultCount = _resolveRowsConfig.resultCount,
        values = _resolveRowsConfig.values;

    var addCalcFoundRows = function addCalcFoundRows(sql) {
      var pieces = sql.split(' ');
      pieces.splice(1, 0, 'SQL_CALC_FOUND_ROWS');
      return pieces.join(' ');
    };

    if ((typeof paginate === 'undefined' ? 'undefined' : _typeof(paginate)) === 'object') {
      var _paginate$page = paginate.page,
          page = _paginate$page === undefined ? 1 : _paginate$page,
          _paginate$resultsPerP = paginate.resultsPerPage,
          resultsPerPage = _paginate$resultsPerP === undefined ? 10 : _paginate$resultsPerP;

      return getConnection().then(function (conn) {
        return conn.query({
          sql: stripLimit(addCalcFoundRows(sql)) + ' LIMIT ' + (resultsPerPage + (page > 1 ? ' OFFSET ' + (page - 1) * resultsPerPage : '')),
          nestTables: nestTables,
          values: values
        }).then(function (rows) {
          return conn.query({ sql: 'SELECT FOUND_ROWS() AS count' }).then(function (_ref2) {
            var _ref3 = _slicedToArray(_ref2, 1),
                count = _ref3[0].count;

            connectionDone(conn);
            var resp = {
              resultCount: Number(count),
              results: rows,
              pageCount: Math.ceil(Number(count) / resultsPerPage),
              currentPage: page
            };
            return resp;
          }).catch(function (err) {
            connectionDone(conn);
            return _bluebird2.default.reject(err);
          });
        });
      });
    } else if (resultCount === true) {
      return getConnection().then(function (conn) {
        return conn.query({ sql: addCalcFoundRows(sql), nestTables: nestTables, values: values }).then(function (rows) {
          return conn.query({ sql: 'SELECT FOUND_ROWS() AS count' }).then(function (_ref4) {
            var _ref5 = _slicedToArray(_ref4, 1),
                count = _ref5[0].count;

            connectionDone(conn);
            var resp = {
              resultCount: Number(count),
              results: rows
            };
            return resp;
          }).catch(function (err) {
            connectionDone(conn);
            return _bluebird2.default.reject(err);
          });
        });
      });
    } else {
      return driver.query({ sql: sql, nestTables: nestTables, values: values });
    }
  };

  self.row = function (textOrConfig, maybeValues) {
    var config = resolveRowsConfig(textOrConfig, maybeValues);
    config.sql = stripLimit(config.sql) + ' LIMIT 1';
    return self.rows(textOrConfig, maybeValues).then(function (resp) {
      return Array.isArray(resp) ? _lodash2.default.first(resp) : resp;
    });
  };

  self.build = function () {
    var wrap = function wrap(method) {
      return function () {
        var s = _squel2.default[method]();

        s.run = function () {
          var fig = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

          if (fig.cursor) {
            return runCursor(s, fig.cursor);
          } else {
            var _s$toParam = s.toParam(),
                text = _s$toParam.text,
                values = _s$toParam.values;

            return self.rows(_lodash2.default.extend({ sql: text, values: values }, fig));
          }
        };

        s.one = function () {
          var fig = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

          var _s$toParam2 = s.toParam(),
              text = _s$toParam2.text,
              values = _s$toParam2.values;

          return self.row(_lodash2.default.extend({ sql: text, values: values }, fig));
        };

        s.whereIfDefined = function (sql, value) {
          if (value !== undefined) {
            s.where(sql, value);
          }
          return s;
        };

        return s;
      };
    };

    var buildSelf = {
      select: wrap('select'),
      update: wrap('update'),
      delete: wrap('delete'),
      insert: wrap('insert')
    };

    return buildSelf;
  };

  return self;
};