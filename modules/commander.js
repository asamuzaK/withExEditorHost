/**
 * command.js
 */
"use strict";
/* api */
const {runSetup} = require("./setup");
const {version: hostVersion} = require("../package.json");
const commander = require("commander");
const process = require("process");

/* constants */
const {
  CMD_BROWSER, CMD_BROWSER_DESC, CMD_CONFIG_PATH, CMD_CONFIG_PATH_DESC,
  CMD_EDITOR_ARGS, CMD_EDITOR_ARGS_DESC, CMD_EDITOR_PATH, CMD_EDITOR_PATH_DESC,
  CMD_OVERWRITE_CONFIG, CMD_OVERWRITE_CONFIG_DESC, CMD_OVERWRITE_EDITOR_CONFIG,
  CMD_OVERWRITE_EDITOR_CONFIG_DESC, CMD_SETUP, CMD_SETUP_ALIAS, CMD_SETUP_DESC,
} = require("./constant");

/**
 * run commander
 * @returns {void}
 */
const runCommander = () => {
  commander.exitOverride();
  commander.version(hostVersion, "-v, --version");
  commander.command(CMD_SETUP).alias(CMD_SETUP_ALIAS)
    .description(CMD_SETUP_DESC)
    .option(CMD_BROWSER, CMD_BROWSER_DESC)
    .option(CMD_CONFIG_PATH, CMD_CONFIG_PATH_DESC)
    .option(CMD_OVERWRITE_CONFIG, CMD_OVERWRITE_CONFIG_DESC)
    .option(CMD_OVERWRITE_EDITOR_CONFIG, CMD_OVERWRITE_EDITOR_CONFIG_DESC)
    .option(CMD_EDITOR_PATH, CMD_EDITOR_PATH_DESC)
    .option(CMD_EDITOR_ARGS, CMD_EDITOR_ARGS_DESC)
    .action(runSetup);
  try {
    commander.parse(process.argv);
  } catch (e) {
    // fail through
  }
};

module.exports = {
  runCommander,
};
