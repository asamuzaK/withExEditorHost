/**
 * setup.js
 */
"use strict";
{
  /* api */
  const {CmdArgs, Setup} = require("webExtNativeMsg");
  const {isString, logError} = require("webExtNativeMsg/modules/common");
  const {
    createFile, isDir, isExecutable,
  } = require("webExtNativeMsg/modules/file-util");
  const path = require("path");
  const process = require("process");
  const readline = require("readline");

  /* constants */
  const {CHAR, INDENT} = require("webExtNativeMsg/modules/constant");
  const {
    EDITOR_CONFIG_FILE, EXT_CHROME_ID, EXT_WEB_ID, HOST, HOST_DESC,
  } = require("./modules/constant");
  const PERM_FILE = 0o600;

  /* variable */
  const vars = {
    configPath: null,
    rl: null,
  };

  /* questions */
  const ques = {
    editorPath: "Enter editor path:\n",
    cmdArgs: "Enter command line options:\n",
    filePos: "Put file path after command arguments? [y/n]\n",
  };

  /* editor config */
  const editorConfig = {
    editorPath: "",
    cmdArgs: [],
    fileAfterCmdArgs: false,
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
   * handle editor temporary file position input
   * @param {string} ans - user input
   * @returns {?AsyncFunction} - createEditorConfig()
   */
  const handleFilePosInput = ans => {
    const {rl} = vars;
    let func;
    if (rl && isString(ans)) {
      ans = ans.trim();
      /^y(?:es)?$/i.test(ans) && (editorConfig.fileAfterCmdArgs = true);
      rl.close();
      func = createEditorConfig().catch(logError);
    }
    return func || null;
  };

  /**
   * handle editor cmd args input
   * @param {string} ans - user input
   * @returns {void}
   */
  const handleCmdArgsInput = ans => {
    const {rl} = vars;
    if (rl && isString(ans)) {
      editorConfig.cmdArgs = (new CmdArgs(ans.trim())).toArray();
      rl.question(ques.filePos, handleFilePosInput);
    }
  };

  /**
   * handle editor path input
   * @param {string} ans - user input
   * @returns {void}
   */
  const handleEditorPathInput = ans => {
    const {rl} = vars;
    if (rl) {
      if (isString(ans)) {
        ans = ans.trim();
        if (ans.length) {
          if (isExecutable(ans)) {
            editorConfig.editorPath = ans;
            rl.question(ques.cmdArgs, handleCmdArgsInput);
          } else {
            console.warn(`${ans} is not executable.`);
            rl.question(ques.editorPath, handleEditorPathInput);
          }
        } else {
          rl.question(ques.cmdArgs, handleCmdArgsInput);
        }
      } else {
        rl.question(ques.cmdArgs, handleCmdArgsInput);
      }
    }
  };

  /**
   * setup editor
   * @returns {void}
   */
  const setupEditor = () => {
    const {rl} = vars;
    if (rl) {
      rl.question(ques.editorPath, handleEditorPathInput);
    }
  };

  /**
   * handle setup callback
   * @param {Object} info - info
   * @returns {Function} - setupEditor()
   */
  const handleSetupCallback = info => {
    const {configDirPath: configPath} = info;
    let func;
    if (isString(configPath)) {
      vars.configPath = configPath;
      vars.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      func = setupEditor();
    }
    return func || null;
  };

  /* run setup */
  (new Setup({
    hostDescription: HOST_DESC,
    hostName: HOST,
    chromeExtensionIds: [EXT_CHROME_ID],
    webExtensionIds: [EXT_WEB_ID],
    callback: handleSetupCallback,
  })).run();
}
