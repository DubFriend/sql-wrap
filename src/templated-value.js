export default class SqlWrapTemplatedValue {
  template: string;
  arguments: Array<mixed>;
  constructor(template: string, ...args: Array<mixed>) {
    this.template = template;
    if (Array.isArray(args[0]) && args.length === 1) {
      this.arguments = args[0];
    } else {
      this.arguments = args;
    }
  }
}
