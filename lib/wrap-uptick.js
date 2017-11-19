'use strict';

module.exports = function (s) {
  return '`' + s.replace(/^`/, '').replace(/`$/, '') + '`';
};