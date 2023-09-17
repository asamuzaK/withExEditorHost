/**
 * setup.js
 */

/* api */
import path from 'node:path';
import process from 'node:process';
import readline from 'readline-sync';
import {
  CmdArgs, Setup, createFile, getStat, isDir, isExecutable, isFile
} from 'web-ext-native-msg';
import { isString, throwErr } from './common.js';

/* constants */
import {
  EDITOR_CONFIG_FILE, EXT_CHROME_ID, EXT_WEB_ID, HOST, HOST_DESC
} from './constant.js';
const CHAR = 'utf8';
const INDENT = 2;
const PERM_FILE = 0o644;

/* setup command options */
export const setupOpts = new Map();

/**
 * abort setup
 * @param {string} msg - message
 * @returns {void}
 */
export const abortSetup = msg => {
  console.info(`Setup aborted: ${msg}`);
  process.exit();
};

/**
 * handle editor cmd args input
 * @param {Array} editorArgs - editor cmd args
 * @returns {Array} - cmd args in array
 */
export const handleCmdArgsInput = async editorArgs => {
  let cmdArgs;
  if (Array.isArray(editorArgs)) {
    cmdArgs = editorArgs;
  } else {
    const useCmdArgs =
      readline.keyInYNStrict('Execute editor with command line options?');
    if (useCmdArgs) {
      const ans = readline.question('Input command line options: ');
      cmdArgs = new CmdArgs(ans.trim()).toArray();
    } else {
      cmdArgs = [];
    }
  }
  return cmdArgs;
};

/**
 * handle editor path input
 * @param {string} editorFilePath - editor path
 * @returns {string} - editor path
 */
export const handleEditorPathInput = async editorFilePath => {
  let editorPath;
  if (isFile(editorFilePath) && isExecutable(editorFilePath)) {
    editorPath = editorFilePath;
  } else {
    const ans = readline.question('Input editor path: ');
    const stat = getStat(ans);
    if (stat) {
      if (stat.isFile()) {
        if (isExecutable(ans)) {
          editorPath = ans;
        } else {
          console.warn(`${ans} is not executable.`);
          editorPath = await handleEditorPathInput();
        }
      } else {
        console.warn(`${ans} is not a file.`);
        editorPath = await handleEditorPathInput();
      }
    } else {
      console.warn(`${ans} not found.`);
      editorPath = await handleEditorPathInput();
    }
  }
  return editorPath;
};

/**
 * create editor config
 * @returns {string} - editor config path
 */
export const createEditorConfig = async () => {
  const configPath = setupOpts.get('configPath');
  if (!isDir(configPath)) {
    throw new Error(`No such directory: ${configPath}`);
  }
  const filePath = path.join(configPath, EDITOR_CONFIG_FILE);
  const editorPath =
    await handleEditorPathInput(setupOpts.get('editorFilePath'));
  const cmdArgs = await handleCmdArgsInput(setupOpts.get('editorCmdArgs'));
  const content = `${JSON.stringify({ editorPath, cmdArgs }, null, INDENT)}\n`;
  await createFile(filePath, content, {
    encoding: CHAR,
    flag: 'w',
    mode: PERM_FILE
  });
  console.info(`Created: ${filePath}`);
  return filePath;
};

/**
 * handle setup callback
 * @param {object} info - info
 * @returns {Function} - handleEditorPathInput() / abortSetup()
 */
export const handleSetupCallback = (info = {}) => {
  const { configDirPath: configPath } = info;
  if (!isDir(configPath)) {
    throw new Error(`No such directory: ${configPath}.`);
  }
  const editorArgs = setupOpts.get('editorArgs');
  const editorPath = setupOpts.get('editorPath');
  const overwriteEditorConfig = setupOpts.get('overwriteEditorConfig');
  const file = path.join(configPath, EDITOR_CONFIG_FILE);
  let func;
  setupOpts.set('configPath', configPath);
  if (isString(editorPath)) {
    setupOpts.set('editorFilePath', editorPath.trim());
  }
  if (isString(editorArgs)) {
    setupOpts.set('editorCmdArgs', new CmdArgs(editorArgs.trim()).toArray());
  }
  if (isFile(file) && !overwriteEditorConfig) {
    const ans = readline.keyInYNStrict(`${file} already exists.\nOverwrite?`);
    if (ans) {
      func = createEditorConfig().catch(throwErr);
    } else {
      func = abortSetup(`${file} already exists.`);
    }
  } else {
    func = createEditorConfig().catch(throwErr);
  }
  return func || null;
};

/**
 * run setup
 * @param {object} cmdOpts - cmd options
 * @returns {Function} - setup.run()
 */
export const runSetup = (cmdOpts = {}) => {
  const {
    browser, configPath, editorArgs, editorPath, overwriteConfig,
    overwriteEditorConfig
  } = cmdOpts;
  const opt = {
    hostDescription: HOST_DESC,
    hostName: HOST,
    chromeExtensionIds: [EXT_CHROME_ID],
    webExtensionIds: [EXT_WEB_ID],
    callback: handleSetupCallback
  };
  const setup = new Setup(opt);
  if (isString(browser) && browser.length) {
    setup.browser = browser.trim();
  } else {
    const excludedBrowsers = ['thunderbird'];
    setup.supportedBrowsers = setup.supportedBrowsers.filter(item =>
      !excludedBrowsers.includes(item.toLowerCase())
    );
  }
  if (isString(configPath) && configPath.length) {
    setup.configPath = configPath.trim();
  }
  if (overwriteConfig) {
    setup.overwriteConfig = !!overwriteConfig;
  }
  setupOpts.set('editorArgs', editorArgs);
  setupOpts.set('editorPath', editorPath);
  setupOpts.set('overwriteEditorConfig', overwriteEditorConfig);
  return setup.run();
};
