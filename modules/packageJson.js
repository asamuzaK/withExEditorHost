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
  const { dir, name } = path.parse(fileURLToPath(import.meta.url));
  let pkgPath;
  if (name === 'index') {
    pkgPath = path.resolve(dir, 'package.json');
  } else {
    pkgPath = path.resolve(dir, '../package.json');
  }
  const file = fs.readFileSync(pkgPath, {
    encoding: CHAR, flag: 'r'
  });
  const json = JSON.parse(file);
  return json;
};
