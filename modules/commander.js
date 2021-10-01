/**
 * command.js
 */

/* api */
import { runSetup } from './setup.js';
import commander from 'commander';
import {
  CMD_BROWSER, CMD_BROWSER_DESC, CMD_CONFIG_PATH, CMD_CONFIG_PATH_DESC,
  CMD_EDITOR_ARGS, CMD_EDITOR_ARGS_DESC, CMD_EDITOR_PATH, CMD_EDITOR_PATH_DESC,
  CMD_OVERWRITE_CONFIG, CMD_OVERWRITE_CONFIG_DESC, CMD_OVERWRITE_EDITOR_CONFIG,
  CMD_OVERWRITE_EDITOR_CONFIG_DESC, CMD_SETUP, CMD_SETUP_ALIAS, CMD_SETUP_DESC
} from './constant.js';

/**
 * parse command
 *
 * @param {Array} args - process.argv
 * @returns {void}
 */
export const parseCommand = args => {
  const reg = /^(?:(?:--)?help|-[h|v]|--version|s(?:etup)?)$/;
  if (Array.isArray(args) && args.some(arg => reg.test(arg))) {
    commander.exitOverride();
    commander.version(process.env.npm_package_version, '-v, --version');
    commander.command(CMD_SETUP).alias(CMD_SETUP_ALIAS)
      .description(CMD_SETUP_DESC)
      .option(CMD_BROWSER, CMD_BROWSER_DESC)
      .option(CMD_CONFIG_PATH, CMD_CONFIG_PATH_DESC)
      .option(CMD_OVERWRITE_CONFIG, CMD_OVERWRITE_CONFIG_DESC)
      .option(CMD_OVERWRITE_EDITOR_CONFIG, CMD_OVERWRITE_EDITOR_CONFIG_DESC)
      .option(CMD_EDITOR_PATH, CMD_EDITOR_PATH_DESC)
      .option(CMD_EDITOR_ARGS, CMD_EDITOR_ARGS_DESC)
      .action(runSetup);
    commander.parse(args);
  }
};

export {
  commander
};
