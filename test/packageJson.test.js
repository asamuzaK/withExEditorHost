/* api */
import { assert } from 'chai';
import { describe, it } from 'mocha';

/* test */
import { parsePackageJson } from '../modules/packageJson.js';

describe('parsePackageJson', () => {
  it('should get object', async () => {
    const res = await parsePackageJson();
    assert.isObject(res);
    assert.isDefined(res.name);
    assert.isDefined(res.version);
  });
});
