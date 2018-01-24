// @flow

import _ from 'lodash';
import sqlString from 'sqlstring';

export default class SqlWrapCompiledValue {
  template: string;
  arguments: Array<mixed>;

  constructor(template: string, ...args: Array<mixed>) {
    this.template = template;
    if (_.isArray(_.first(args)) && args.length === 1) {
      this.arguments = _.first(args);
    } else {
      this.arguments = args;
    }
  }
}
