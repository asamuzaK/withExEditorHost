/*!
 * withExEditorHost
 *
 * @license MIT
 * @copyright asamuzaK (Kazz)
 * @see {@link https://github.com/asamuzaK/withExEditorHost/blob/master/LICENSE}
 */

/* api */
import process from 'node:process';
import { parseCommand } from './modules/commander.js';
import { logErr, throwErr } from './modules/common.js';
import { startup } from './modules/main.js';

/* process */
process.on('uncaughtException', throwErr);
process.on('unhandledRejection', logErr);

/* startup */
(() => {
  const args = process.argv;
  const reg = /^(?:(?:--)?help|-[h|v]|--version|s(?:etup)?)$/;
  let func;
  if (args.some(arg => reg.test(arg))) {
    func = parseCommand(args);
  } else {
    func = startup();
  }
  return func;
})();
