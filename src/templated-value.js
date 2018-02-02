import _ from 'lodash';

export default class SqlWrapTemplatedValue {
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
