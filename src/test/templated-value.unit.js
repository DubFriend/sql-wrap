// @flow
import { expect } from 'chai';
import TemplatedValue from '../templated-value';

describe('TemplatedValue.unit', () => {
  it('should set template and a list of arguments', () => {
    const val = new TemplatedValue('foo', 'a', 'b');
    expect(val.template).to.equal('foo');
    expect(val.arguments).to.deep.equal(['a', 'b']);
  });

  it(
    'should optionally set arguments from an array ' +
      'passed as the second argument to the constructor',
    () => {
      const val = new TemplatedValue('bar', [1, 2]);
      expect(val.template).to.equal('bar');
      expect(val.arguments).to.deep.equal([1, 2]);
    }
  );
});
