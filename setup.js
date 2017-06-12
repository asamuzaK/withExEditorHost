/**
 * setup.js
 */
"use strict";
{
  /* api */
  const {ChildProcess, CmdArgs} = require("./modules/child-process");
  const {allowedField, browserData} = require("./modules/browser-data");
  const {escapeChar, getType, isString, logError} = require("./modules/common");
  const {
    createDir, createFile, getAbsPath, isDir, isExecutable, isFile,
  } = require("./modules/file-util");
  const os = require("os");
  const path = require("path");
  const process = require("process");
  const readline = require("readline");

  /* constants */
  const {HOST} = require("./modules/constant");
  const CHAR = "utf8";
  const DIR_CWD = process.cwd();
  const DIR_HOME = os.homedir();
  const IS_MAC = os.platform() === "darwin";
  const IS_WIN = os.platform() === "win32";
  const PERM_DIR = 0o700;
  const PERM_EXEC = 0o700;
  const PERM_FILE = 0o600;

  /* editor config */
  const editorConfig = {
    editorPath: "",
    cmdArgs: [],
    fileAfterCmdArgs: false,
  };

  /* variables */
  const vars = {
    browser: null,
    configDir: [DIR_CWD, "config"],
  };

  /**
   * set browser
   * @param {string} browser - browser config data
   * @returns {void}
   */
  const setBrowser = browser => {
    browser && Object.keys(browser).length && browser.alias &&
      (vars.browser = browser);
  };

  /**
   * set config directory
   * @param {string} dir - directory path
   * @returns {void}
   */
  const setConfigDir = dir => {
    const configPath = getAbsPath(dir);
    if (!configPath) {
      throw new Error(`Failed to normalize ${dir}`);
    }
    if (!configPath.startsWith(DIR_HOME)) {
      throw new Error(`Config path is not sub directory of ${DIR_HOME}.`);
    }
    const homeDir = escapeChar(DIR_HOME, /(\\)/g);
    const reHomeDir = new RegExp(`^(?:${homeDir}|~)`);
    const subDir = (configPath.replace(reHomeDir, "")).split(path.sep)
      .filter(i => i);
    vars.configDir = subDir.length && [DIR_HOME, ...subDir] || [DIR_HOME];
  };

  /**
   * get browser data
   * @param {string} key - key
   * @returns {Object} - browser data
   */
  const getBrowserData = key => {
    let browser;
    key = isString(key) && key.toLowerCase().trim();
    if (key) {
      const items = Object.keys(browserData);
      for (const item of items) {
        if (item === key) {
          const obj = browserData[item];
          if (IS_WIN && obj.regWin || IS_MAC && obj.hostMac ||
              !IS_WIN && !IS_MAC && obj.hostLinux) {
            browser = browserData[item];
          }
          break;
        }
      }
    }
    return browser || null;
  };

  /**
   * get browser specific config directory
   * @returns {?Array} - config directory array
   */
  const getBrowserConfigDir = () => {
    const {browser, configDir} = vars;
    let dir;
    if (browser) {
      const {alias, aliasLinux, aliasMac, aliasWin} = browser;
      dir = IS_WIN && [...configDir, aliasWin || alias] ||
            IS_MAC && [...configDir, aliasMac || alias] ||
            [...configDir, aliasLinux || alias];
    }
    return dir || null;
  };

  /* file handlers */
  /**
   * create editor config
   * @param {string} configPath - config directory path
   * @returns {string} - editor config path
   */
  const createEditorConfig = configPath => {
    if (!isDir(configPath)) {
      throw new Error(`No such directory: ${configPath}.`);
    }
    const editorConfigPath = path.join(configPath, "editorconfig.json");
    createFile(
      editorConfigPath, JSON.stringify(editorConfig, null, "  "),
      {encoding: CHAR, flag: "w", mode: PERM_FILE}
    );
    if (!isFile(editorConfigPath)) {
      throw new Error(`Failed to create ${editorConfigPath}.`);
    }
    console.info(`Created: ${editorConfigPath}`);
    return editorConfigPath;
  };

  /**
   * create app manifest
   * @param {string} configPath - config direcory path
   * @param {string} shellPath - shell script path
   * @returns {string} - app manifest path
   */
  const createAppManifest = (configPath, shellPath) => {
    if (!isDir(configPath)) {
      throw new Error(`No such directory: ${configPath}.`);
    }
    if (!isFile(shellPath)) {
      throw new Error(`No such file: ${shellPath}.`);
    }
    const {browser} = vars;
    if (!browser) {
      throw new Error(`Expected Object but got ${getType(browser)}.`);
    }
    const {hostLinux, hostMac, regWin, type} = browser;
    const {key, value} = allowedField[type];
    const manifest = JSON.stringify({
      [key]: [...value],
      description: "Native messaging host for withExEditor",
      name: HOST,
      path: shellPath,
      type: "stdio",
    });
    const fileName = `${HOST}.json`;
    const filePath = path.resolve(
      IS_WIN && path.join(configPath, fileName) ||
      IS_MAC && path.join(...hostMac, fileName) ||
      path.join(...hostLinux, fileName)
    );
    if (IS_WIN) {
      const reg = path.join(process.env.WINDIR, "system32", "reg.exe");
      const regKey = path.join(...regWin);
      const args = ["add", regKey, "/ve", "/d", filePath, "/f"];
      const opt = {
        cwd: null,
        encoding: CHAR,
        env: process.env,
      };
      const proc = (new ChildProcess(reg, args, opt)).spawn();
      proc.on("error", e => {
        throw e;
      });
      proc.stderr.on("data", data => {
        data && console.error(`stderr: ${reg}: ${data}`);
      });
      proc.on("close", code => {
        if (code === 0) {
          console.info(`Created: ${regKey}`);
        } else {
          console.warn(`${reg} exited with ${code}.`);
        }
      });
    } else {
      const hostDir = IS_MAC && hostMac || hostLinux;
      const hostDirPath = createDir(hostDir, PERM_DIR);
      if (!isDir(hostDirPath)) {
        throw new Error(`Failed to create ${path.join(...hostDir)}.`);
      }
    }
    createFile(
      filePath, manifest,
      {encoding: CHAR, flag: "w", mode: PERM_FILE}
    );
    if (!isFile(filePath)) {
      throw new Error(`Failed to create ${filePath}.`);
    }
    console.info(`Created: ${filePath}`);
    return filePath;
  };

  /**
   * create shell script
   * @param {string} configPath - config directory path
   * @returns {string} - shell script path
   */
  const createShellScript = configPath => {
    if (!isDir(configPath)) {
      throw new Error(`No such directory: ${configPath}.`);
    }
    const shellExt = IS_WIN && "cmd" || "sh";
    const shellPath = path.join(configPath, `${HOST}.${shellExt}`);
    const indexPath = path.resolve(path.join(DIR_CWD, "index.js"));
    if (isFile(indexPath)) {
      const node = process.argv0;
      const cmd = `${node} ${indexPath}`;
      const file = IS_WIN && `@echo off\n${cmd}\n` ||
                   `#!/usr/bin/env bash\n${cmd}\n`;
      createFile(
        shellPath, file,
        {encoding: CHAR, flag: "w", mode: PERM_EXEC}
      );
    }
    if (!isFile(shellPath)) {
      throw new Error(`Failed to create ${shellPath}.`);
    }
    console.info(`Created: ${shellPath}`);
    return shellPath;
  };

  /**
   * create config directory
   * @returns {string} - config directory path
   */
  const createConfig = () => {
    const dir = getBrowserConfigDir();
    if (!Array.isArray(dir)) {
      throw new TypeError(`Expected Array but got ${getType(dir)}.`);
    }
    const configPath = createDir(dir, PERM_DIR);
    if (!isDir(configPath)) {
      throw new Error(`Failed to create ${path.join(dir)}.`);
    }
    console.info(`Created: ${configPath}`);
    return configPath;
  };

  /**
   * setup
   * @returns {Promise.<Array>} - results of each handler
   */
  const setup = () => {
    const configPath = createConfig();
    const shellPath = createShellScript(configPath);
    return Promise.all([
      createAppManifest(configPath, shellPath),
      createEditorConfig(configPath),
    ]);
  };

  /* readline */
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  /* questions */
  const ques = {
    browser: "Enter which browser you would like to set up the host for:\n",
    editorPath: "Enter editor path:\n",
    cmdArgs: "Enter command line options:\n",
    filePos: "Put file path after command arguments? [y/n]\n",
  };

  /**
   * abort setup
   * @param {string} msg - message
   * @returns {void}
   */
  const abortSetup = msg => {
    console.info(`Setup aborted: ${msg}`);
    process.exit(1);
  };

  /**
   * handle editor temporary file position input
   * @param {string} ans - user input
   * @returns {AsyncFuncrtion} - setup
   */
  const handleFilePosInput = ans => {
    if (isString(ans)) {
      ans = ans.trim();
      /^y(?:es)?$/i.test(ans) && (editorConfig.fileAfterCmdArgs = true);
    }
    rl.close();
    return setup().catch(logError);
  };

  /**
   * handle editor cmd args input
   * @param {string} ans - user input
   * @returns {void}
   */
  const handleCmdArgsInput = ans => {
    if (isString(ans)) {
      editorConfig.cmdArgs = (new CmdArgs(ans.trim())).toArray();
    }
    rl.question(ques.filePos, handleFilePosInput);
  };

  /**
   * handle editor path input
   * @param {string} ans - user input
   * @returns {void}
   */
  const handleEditorPathInput = ans => {
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
  };

  /**
   * handle browser config directory input
   * @param {string} ans - user input
   * @returns {void}
   */
  const handleBrowserConfigDir = ans => {
    const dir = getBrowserConfigDir();
    if (!Array.isArray(dir)) {
      throw new TypeError(`Expected Array but got ${getType(dir)}.`);
    }
    const msg = `${path.join(...dir)} already exists.`;
    if (isString(ans)) {
      ans = ans.trim();
      if (/^y(?:es)?$/i.test(ans)) {
        rl.question(ques.editorPath, handleEditorPathInput);
      } else {
        abortSetup(msg);
      }
    } else {
      abortSetup(msg);
    }
  };

  /**
   * handle browser input
   * @param {string} ans - user input
   * @returns {void}
   */
  const handleBrowserInput = ans => {
    const msg = "Browser not specified.";
    if (isString(ans)) {
      ans = ans.trim();
      if (ans.length) {
        const browser = getBrowserData(ans);
        browser && setBrowser(browser);
        if (browser) {
          const dir = getBrowserConfigDir();
          if (!Array.isArray(dir)) {
            throw new TypeError(`Expected Array but got ${getType(dir)}.`);
          }
          const dirPath = path.join(...dir);
          if (isDir(dirPath)) {
            rl.question(`${dirPath} already exists. Overwrite? [y/n]\n`,
                        handleBrowserConfigDir);
          } else {
            rl.question(ques.editorPath, handleEditorPathInput);
          }
        } else {
          // TODO: Add custom setup
          abortSetup(`${ans} not supported.`);
        }
      } else {
        abortSetup(msg);
      }
    } else {
      abortSetup(msg);
    }
  };

  /**
   * extract argument
   * @param {string} arg - argument in key=value format
   * @param {RegExp} re - RegExp
   * @returns {string} - argument value
   */
  const extractArg = (arg, re) => {
    let value;
    if (isString(arg) && re && re.ignoreCase) {
      arg = re.exec(arg.trim());
      arg && ([, value] = arg);
    }
    return value || null;
  };

  /* start up */
  {
    const [, , ...args] = process.argv;
    let browser;
    if (Array.isArray(args) && args.length) {
      for (const arg of args) {
        let value;
        if (/^--browser=/i.test(arg)) {
          value = extractArg(arg, /^--browser=(.+)$/i);
          value && (browser = getBrowserData(value));
          browser && setBrowser(browser);
        } else if (/^--config-path=/i.test(arg)) {
          value = extractArg(arg, /^--config-path=(.+)$/i);
          value && setConfigDir(value);
        }
      }
    }
    if (browser) {
      const dir = getBrowserConfigDir();
      if (!Array.isArray(dir)) {
        throw new TypeError(`Expected Array but got ${getType(dir)}.`);
      }
      const dirPath = path.join(...dir);
      if (isDir(dirPath)) {
        rl.question(`${dirPath} already exists. Overwrite? [y/n]\n`,
                    handleBrowserConfigDir);
      } else {
        rl.question(ques.editorPath, handleEditorPathInput);
      }
    } else {
      const arr = [];
      const items = Object.keys(browserData);
      for (const item of items) {
        const obj = browserData[item];
        (IS_WIN && obj.regWin || IS_MAC && obj.hostMac ||
         !IS_WIN && !IS_MAC && obj.hostLinux) &&
          arr.push(item);
      }
      rl.question(`${ques.browser}[${arr.join(" ")}]\n`, handleBrowserInput);
    }
  }
}
