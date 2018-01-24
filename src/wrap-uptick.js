// @flow
module.exports = (s: string): string =>
  `\`${s.replace(/^`/, '').replace(/`$/, '')}\``;
