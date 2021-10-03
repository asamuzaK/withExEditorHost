/* api */
import { assert } from 'chai';
import { describe, it } from 'mocha';
import process from 'process';

/* test */
import { version } from '../modules/version.js';

describe('version', () => {
  it('should get equal value', () => {
    assert.isString(version);
    assert.strictEqual(version, process.env.npm_package_version);
  });
});
