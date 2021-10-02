/**
 * packageJson.js
 */

/* api */
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

/* constants */
const CHAR = 'utf8';

/**
 * parse package.json
 *
 * @returns {object} - parsed json
 */
export const parsePackageJson = () => {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const pkgPath = path.resolve(dirname, '../package.json');
  const file = fs.readFileSync(pkgPath, {
    encoding: CHAR, flag: 'r'
  });
  const json = JSON.parse(file);
  return json;
};
