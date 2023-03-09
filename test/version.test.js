/* api */
import process from 'node:process';
import { assert } from 'chai';
import { describe, it } from 'mocha';

/* test */
import { version } from '../modules/version.js';

describe('version', () => {
  it('should get equal value', () => {
    assert.isString(version);
    assert.strictEqual(version, process.env.npm_package_version);
  });
});
