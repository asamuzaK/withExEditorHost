/**
 * setup.js
 */
"use strict";
/* api */
const {
  CmdArgs, createFile, isDir, isExecutable, isFile,
} = require("web-ext-native-msg");
const {Command} = require("commander");
const {isString, logErr} = require("./common");
const path = require("path");
const process = require("process");
const readline = require("readline");

/* constants */
const {
  CMD_EDITOR_ARGS, CMD_EDITOR_ARGS_DESC, CMD_EDITOR_PATH, CMD_EDITOR_PATH_DESC,
  CMD_OVERWRITE_EDITOR_CONFIG, CMD_OVERWRITE_EDITOR_CONFIG_DESC,
  EDITOR_CONFIG_FILE,
} = require("./constant");
const CHAR = "utf8";
const INDENT = 2;
const PERM_FILE = 0o600;

/* variable */
const vars = {
  configPath: null,
  editorArgs: [],
  editorPath: "",
  overwriteEditorConfig: false,
  rl: null,
};

/* questions */
const ques = {
  editorPath: "Enter editor path:\n",
  cmdArgs: "Enter command line options:\n",
};

/* editor config */
const editorConfig = {
  editorPath: "",
  cmdArgs: [],
};

/**
 * abort setup
 * @param {string} msg - message
 * @returns {void}
 */
const abortSetup = msg => {
  const {rl} = vars;
  console.info(`Setup aborted: ${msg}`);
  rl && rl.close();
  process.exit(1);
};

/**
 * create editor config
 * @returns {string} - editor config path
 */
const createEditorConfig = async () => {
  const {configPath} = vars;
  if (await !isDir(configPath)) {
    throw new Error(`No such directory: ${configPath}.`);
  }
  const editorConfigPath = path.join(configPath, EDITOR_CONFIG_FILE);
  const file = await createFile(
    editorConfigPath, JSON.stringify(editorConfig, null, INDENT),
    {encoding: CHAR, flag: "w", mode: PERM_FILE}
  );
  if (!file) {
    throw new Error(`Failed to create ${editorConfigPath}.`);
  }
  console.info(`Created: ${editorConfigPath}`);
  return editorConfigPath;
};

/**
 * handle editor cmd args input
 * @param {string} ans - user input
 * @returns {?AsyncFunction} - createEditorConfig()
 */
const handleCmdArgsInput = ans => {
  const {rl} = vars;
  let func;
  if (rl && isString(ans)) {
    editorConfig.cmdArgs = (new CmdArgs(ans.trim())).toArray();
    rl.close();
    func = createEditorConfig().catch(logErr);
  }
  return func || null;
};

/**
 * handle editor path input
 * @param {string} ans - user input
 * @returns {void}
 */
const handleEditorPathInput = ans => {
  const {editorArgs, rl} = vars;
  if (rl) {
    let args;
    if (Array.isArray(editorArgs) && editorArgs.length) {
      args = (new CmdArgs(editorArgs)).toString();
    }
    if (isString(ans)) {
      ans = ans.trim();
      if (ans.length) {
        if (isFile(ans) && isExecutable(ans)) {
          editorConfig.editorPath = ans;
          if (args) {
            handleCmdArgsInput(args);
          } else {
            rl.question(ques.cmdArgs, handleCmdArgsInput);
          }
        } else {
          console.warn(`${ans} is not executable.`);
          rl.question(ques.editorPath, handleEditorPathInput);
        }
      } else if (args) {
        handleCmdArgsInput(args);
      } else {
        rl.question(ques.cmdArgs, handleCmdArgsInput);
      }
    } else if (args) {
      handleCmdArgsInput(args);
    } else {
      rl.question(ques.cmdArgs, handleCmdArgsInput);
    }
  }
};

/**
 * handle editor config file input
 * @param {string} ans - user input
 * @returns {void}
 */
const handleEditorConfigFileInput = ans => {
  const {configPath, editorPath, rl} = vars;
  if (!isDir(configPath)) {
    throw new Error(`No such directory: ${configPath}.`);
  }
  if (rl) {
    const msg =
      `${path.join(configPath, EDITOR_CONFIG_FILE)} already exists.`;
    if (isString(ans)) {
      ans = ans.trim();
      if (/^y(?:es)?$/i.test(ans)) {
        if (isString(editorPath) && editorPath.length) {
          handleEditorPathInput(editorPath);
        } else {
          rl.question(ques.editorPath, handleEditorPathInput);
        }
      } else {
        rl.close();
        abortSetup(msg);
      }
    } else {
      rl.close();
      abortSetup(msg);
    }
  }
};

/**
 * setup editor
 * @returns {void}
 */
const setupEditor = () => {
  const {configPath, editorPath, overwriteEditorConfig, rl} = vars;
  if (!isDir(configPath)) {
    throw new Error(`No such directory: ${configPath}.`);
  }
  if (rl) {
    const filePath = path.join(configPath, EDITOR_CONFIG_FILE);
    if (isFile(filePath)) {
      if (overwriteEditorConfig) {
        if (editorPath) {
          handleEditorPathInput(editorPath);
        } else {
          rl.question(ques.editorPath, handleEditorPathInput);
        }
      } else {
        rl.question(`${filePath} already exists. Overwrite? [y/n]\n`,
                    handleEditorConfigFileInput);
      }
    } else if (editorPath) {
      handleEditorPathInput(editorPath);
    } else {
      rl.question(ques.editorPath, handleEditorPathInput);
    }
  }
};

/**
 * handle setup callback
 * @param {Object} info - info
 * @returns {Function} - setupEditor()
 */
const handleSetupCallback = (info = {}) => {
  const {configDirPath: configPath} = info;
  let func;
  if (isString(configPath) && isDir(configPath)) {
    const {
      editorArgs, editorPath, overwriteEditorConfig,
    } = (new Command()).option(CMD_EDITOR_ARGS, CMD_EDITOR_ARGS_DESC)
      .option(CMD_EDITOR_PATH, CMD_EDITOR_PATH_DESC)
      .option(CMD_OVERWRITE_EDITOR_CONFIG, CMD_OVERWRITE_EDITOR_CONFIG_DESC)
      .allowUnknownOption().parse(process.argv).opts();
    vars.overwriteEditorConfig = !!overwriteEditorConfig;
    vars.editorPath = isString(editorPath) && editorPath.trim() || "";
    vars.editorArgs = isString(editorArgs) &&
                      (new CmdArgs(editorArgs.trim())).toArray() || [];
    vars.configPath = configPath;
    vars.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    func = setupEditor();
  }
  return func || null;
};

module.exports = {
  handleSetupCallback,
};
