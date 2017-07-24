'use strict';

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _query = require('./query');

var _query2 = _interopRequireDefault(_query);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function (_ref) {
  var driver = _ref.driver,
      sqlType = _ref.sqlType;

  var self = {};

  var query = (0, _query2.default)({ driver: driver, sqlType: sqlType });

  return self;
};