// @flow
import type { Value } from './type';

export default class SqlWrapTemplatedValue {
  template: string;
  arguments: Array<Value>;
  constructor(
    template: string,
    firstArg: Array<Value> | Value,
    ...args: Array<Value>
  ) {
    this.template = template;
    if (Array.isArray(firstArg)) {
      this.arguments = firstArg;
    } else {
      this.arguments = [firstArg].concat(args);
    }
  }
}
