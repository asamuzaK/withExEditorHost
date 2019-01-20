/**
 * setup.js
 */
"use strict";
/* api */
const {
  CmdArgs, createFile, isDir, isExecutable, isFile,
} = require("web-ext-native-msg");
const {isString, throwErr} = require("./common");
const commander = require("commander");
const path = require("path");
const process = require("process");
const readline = require("readline-sync");

/* constants */
const {EDITOR_CONFIG_FILE} = require("./constant");
const CHAR = "utf8";
const INDENT = 2;
const PERM_FILE = 0o600;

/**
 * abort setup
 * @param {string} msg - message
 * @returns {void}
 */
const abortSetup = msg => {
  console.info(`Setup aborted: ${msg}`);
  process.exit();
};

/**
 * handle editor cmd args input
 * @param {Array} editorArgs - editor cmd args
 * @returns {Array} - cmd args in array
 */
const handleCmdArgsInput = async editorArgs => {
  let cmdArgs;
  if (Array.isArray(editorArgs)) {
    cmdArgs = editorArgs;
  } else {
    const ans = readline.question("Input command line options: ");
    cmdArgs = (new CmdArgs(ans.trim())).toArray();
  }
  return cmdArgs;
};

/**
 * handle editor path input
 * @param {string} editorFilePath - editor path
 * @returns {string} - editor path
 */
const handleEditorPathInput = async editorFilePath => {
  let editorPath;
  if (isFile(editorFilePath) && isExecutable(editorFilePath)) {
    editorPath = editorFilePath;
  } else {
    const ans = readline.questionPath("Input editor path: ", {
      isFile: true,
    });
    if (isExecutable(ans)) {
      editorPath = ans;
    } else {
      console.warn(`${ans} is not executable.`);
      editorPath = await handleEditorPathInput();
    }
  }
  return editorPath;
};

/**
 * create editor config
 * @param {Object} opt - config options
 * @returns {string} - editor config path
 */
const createEditorConfig = async (opt = {}) => {
  const {configPath, editorArgs, editorPath: editorFilePath} = opt;
  if (!isDir(configPath)) {
    throw new Error(`No such directory: ${configPath}`);
  }
  const filePath = path.join(configPath, EDITOR_CONFIG_FILE);
  const editorPath = await handleEditorPathInput(editorFilePath);
  const cmdArgs = await handleCmdArgsInput(editorArgs);
  const content = `${JSON.stringify({editorPath, cmdArgs}, null, INDENT)}\n`;
  await createFile(filePath, content, {
    encoding: CHAR,
    flag: "w",
    mode: PERM_FILE,
  });
  console.info(`Created: ${filePath}`);
  return filePath;
};

/**
 * handle setup callback
 * @param {Object} info - info
 * @returns {AsyncFunction|Function} - handleEditorPathInput() / abortSetup()
 */
const handleSetupCallback = (info = {}) => {
  const {configDirPath: configPath} = info;
  if (!isDir(configPath)) {
    throw new Error(`No such directory: ${configPath}.`);
  }
  const {editorArgs, editorPath, overwriteEditorConfig} = commander.opts();
  const file = path.join(configPath, EDITOR_CONFIG_FILE);
  const opt = {
    configPath,
    editorArgs: null,
    editorPath: null,
  };
  let func;
  if (isString(editorPath)) {
    opt.editorPath = editorPath.trim();
  }
  if (isString(editorArgs)) {
    opt.editorArgs = (new CmdArgs(editorArgs.trim())).toArray();
  }
  if (isFile(file) && !overwriteEditorConfig) {
    const ans = readline.keyInYNStrict(`${file} already exists.\nOverwrite?`);
    if (ans) {
      func = createEditorConfig(opt).catch(throwErr);
    } else {
      func = abortSetup(`${file} already exists.`);
    }
  } else {
    func = createEditorConfig(opt).catch(throwErr);
  }
  return func || null;
};

module.exports = {
  abortSetup,
  createEditorConfig,
  handleCmdArgsInput,
  handleEditorPathInput,
  handleSetupCallback,
};
