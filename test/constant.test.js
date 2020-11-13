'use strict';
/* api */
const constants = require('../modules/constant');
const { assert } = require('chai');
const { describe, it } = require('mocha');

describe('constants', () => {
  const items = Object.keys(constants);
  for (const item of items) {
    const constant = constants[item];
    it('should get string', () => {
      assert.isString(constant);
    });
  }
});
