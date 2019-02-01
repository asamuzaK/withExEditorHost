/**
 * index.js
 */
"use strict";
/* api */
const {
  handleExit, handleReject, readStdin, runSetup, startup,
} = require("./modules/main");
const {throwErr} = require("./modules/common");
const {version: hostVersion} = require("./package.json");
const commander = require("commander");
const process = require("process");

/* constants */
const {
  CMD_BROWSER, CMD_BROWSER_DESC, CMD_CONFIG_PATH, CMD_CONFIG_PATH_DESC,
  CMD_EDITOR_ARGS, CMD_EDITOR_ARGS_DESC, CMD_EDITOR_PATH, CMD_EDITOR_PATH_DESC,
  CMD_OVERWRITE_CONFIG, CMD_OVERWRITE_CONFIG_DESC, CMD_OVERWRITE_EDITOR_CONFIG,
  CMD_OVERWRITE_EDITOR_CONFIG_DESC,
} = require("./modules/constant");

/* commands */
commander.version(hostVersion, "-v, --version");
commander.option(CMD_BROWSER, CMD_BROWSER_DESC)
  .option(CMD_CONFIG_PATH, CMD_CONFIG_PATH_DESC)
  .option(CMD_OVERWRITE_CONFIG, CMD_OVERWRITE_CONFIG_DESC)
  .option(CMD_OVERWRITE_EDITOR_CONFIG, CMD_OVERWRITE_EDITOR_CONFIG_DESC)
  .option(CMD_EDITOR_PATH, CMD_EDITOR_PATH_DESC)
  .option(CMD_EDITOR_ARGS, CMD_EDITOR_ARGS_DESC);
commander.command("setup").alias("s").description("run setup").action(() => {
  const opt = commander.opts();
  return runSetup(opt);
});
commander.parse(process.argv);

/* process */
process.on("SIGINT", () => { process.exit() });
process.on("SIGTERM", () => { process.exit() });
process.on("exit", handleExit);
process.on("uncaughtException", throwErr);
process.on("unhandleRejection", handleReject);
process.stdin.on("data", readStdin);

startup();
