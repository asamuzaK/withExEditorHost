/* api */
import { assert } from 'chai';
import { describe, it } from 'mocha';
import { fileURLToPath } from 'url';
import path from 'path';
import sinon from 'sinon';

/* test */
import { parsePackageJson } from '../modules/packageJson.js';

describe('parsePackageJson', () => {
  it('should get object', async () => {
    const res = await parsePackageJson();
    assert.isObject(res);
    assert.isDefined(res.name);
    assert.isDefined(res.version);
  });

  it('should get object', async () => {
    const dirname = path.resolve(fileURLToPath(import.meta.url), '../../');
    const stubParse = sinon.stub(path, 'parse').returns({
      dir: dirname,
      name: 'index'
    });
    const res = await parsePackageJson();
    assert.isObject(res);
    assert.isDefined(res.name);
    assert.isDefined(res.version);
    stubParse.restore();
  });
});
