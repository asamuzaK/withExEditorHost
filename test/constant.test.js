/* api */
import { assert } from 'chai';
import { describe, it } from 'mocha';

/* test */
import * as constants from '../modules/constant.js';

describe('constants', () => {
  const items = Object.keys(constants);
  for (const item of items) {
    const constant = constants[item];
    it('should get string', () => {
      assert.isString(constant);
    });
  }
});
