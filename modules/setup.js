/**
 * setup.js
 */

/* api */
import path from 'node:path';
import process from 'node:process';
import { confirm, input } from '@inquirer/prompts';
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

/* wrap inquirer (for test) */
export const inquirer = {
  confirm,
  input
};

/* setup command options */
export const setupOpts = new Map();

/**
 * abort setup
 * @param {string} msg - message
 * @param {number} [code] - exit code
 * @returns {void}
 */
export const abortSetup = (msg, code) => {
  setupOpts.clear();
  console.info(`Setup aborted: ${msg}`);
  if (!Number.isInteger(code)) {
    code = 1;
  }
  process.exit(code);
};

/**
 * handle inquirer error
 * @param {object} e - Error
 * @throws
 * @returns {Function} - abortSetup
 */
export const handleInquirerError = e => {
  if (e instanceof Error) {
    let code = 1;
    if (e.name === 'ExitPromptError') {
      code = 130;
    }
    return abortSetup(e.message, code);
  }
  return abortSetup('Unknown error.', 1);
};

/**
 * handle editor cmd args input
 * @param {Array} editorArgs - editor cmd args
 * @returns {Promise.<Array>} - cmd args in array
 */
export const handleCmdArgsInput = async editorArgs => {
  let cmdArgs;
  if (Array.isArray(editorArgs)) {
    cmdArgs = editorArgs;
  } else {
    const useCmdArgs = await inquirer.confirm({
      message: 'Execute editor with command line options?',
      default: false
    }).catch(handleInquirerError);
    if (useCmdArgs) {
      const ans = await inquirer.input({
        message: 'Input command line options:'
      }).catch(handleInquirerError);
      if (ans) {
        cmdArgs = new CmdArgs(ans.trim()).toArray();
      } else {
        cmdArgs = [];
      }
    } else {
      cmdArgs = [];
    }
  }
  return cmdArgs;
};

/**
 * handle editor path input
 * @param {string} editorFilePath - editor path
 * @returns {Promise.<string>} - editor path
 */
export const handleEditorPathInput = async editorFilePath => {
  if (!editorFilePath) {
    editorFilePath = await inquirer.input({
      message: 'Input editor path:',
      required: true
    }).catch(handleInquirerError);
  }
  let parsedPath = editorFilePath;
  if (/\$\{\w+\}|\$\w+/.test(editorFilePath)) {
    const envVars = editorFilePath.match(/\$\{\w+\}|\$\w+/g);
    for (const envVar of envVars) {
      const key = envVar.replace(/^\$\{?/, '').replace(/\}$/, '');
      if (process.env[key]) {
        parsedPath = parsedPath.replace(envVar, process.env[key]);
      }
    }
  }
  let editorPath;
  const stat = getStat(parsedPath);
  if (stat) {
    if (stat.isFile()) {
      if (isExecutable(parsedPath)) {
        editorPath = editorFilePath;
      } else {
        console.warn(`${editorFilePath} is not executable.`);
        editorPath = await handleEditorPathInput();
      }
    } else {
      console.warn(`${editorFilePath} is not a file.`);
      editorPath = await handleEditorPathInput();
    }
  } else {
    console.warn(`${editorFilePath} not found.`);
    editorPath = await handleEditorPathInput();
  }
  return editorPath;
};

/**
 * create editor config
 * @returns {Promise.<string>} - editor config path
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
 * confirm overwrite editorconfig file
 * @param {string} file - file path
 * @returns {Promise.<Promise|void>} - handleEditorPathInput() / abortSetup()
 */
export const confirmOverwriteEditorConfig = async file => {
  let func;
  const ans = await inquirer.confirm({
    message: `${file} already exists. Overwrite?`,
    default: false
  }).catch(handleInquirerError);
  if (ans) {
    func = createEditorConfig();
  } else {
    func = abortSetup(`${file} already exists.`, 1);
  }
  return func;
};

/**
 * handle setup callback
 * @param {object} info - info
 * @returns {Promise} - promise chain
 */
export const handleSetupCallback = (info = {}) => {
  const { configDirPath: configPath } = info;
  if (!isDir(configPath)) {
    throw new Error(`No such directory: ${configPath}.`);
  }
  setupOpts.set('configPath', configPath);
  const editorPath = setupOpts.get('editorPath');
  if (isString(editorPath)) {
    setupOpts.set('editorFilePath', editorPath.trim());
  }
  const editorArgs = setupOpts.get('editorArgs');
  if (isString(editorArgs)) {
    setupOpts.set('editorCmdArgs', new CmdArgs(editorArgs.trim()).toArray());
  }
  let func;
  const file = path.join(configPath, EDITOR_CONFIG_FILE);
  const overwriteEditorConfig = setupOpts.get('overwriteEditorConfig');
  if (isFile(file) && !overwriteEditorConfig) {
    func = confirmOverwriteEditorConfig(file).catch(throwErr);
  } else {
    func = createEditorConfig().catch(throwErr);
  }
  return func;
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
