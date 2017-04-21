/**
 * setup.js
 */
"use strict";
{
  /* api */
  const {ChildProcess, CmdArgs} = require("./modules/child-process");
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
  const DIR_HOST_MAC = [DIR_HOME, "Library", "Application Support"];
  const EXT_CHROME = "chromeExtension";
  const EXT_CHROME_ALLOWED = "allowed_origins";
  // NOTE: temporary ID for development
  const EXT_CHROME_ID = "chrome-extension://jakgdeodohnbhngonaabiaklmhfahjbj/";
  const EXT_WEB = "webExtension";
  const EXT_WEB_ALLOWED = "allowed_extensions";
  const EXT_WEB_ID = "jid1-WiAigu4HIo0Tag@jetpack";
  const HKCU_SOFTWARE = ["HKEY_CURRENT_USER", "SOFTWARE"];
  const HOST_DIR_LABEL = "NativeMessagingHosts";
  const IS_MAC = os.platform() === "darwin";
  const IS_WIN = os.platform() === "win32";
  const PERM_DIR = 0o700;
  const PERM_EXEC = 0o700;
  const PERM_FILE = 0o600;

  /* browser config data */
  const browserConfig = {
    chrome: {
      alias: "chrome",
      hostLinux: [DIR_HOME, ".config", "google-chrome", HOST_DIR_LABEL],
      hostMac: [...DIR_HOST_MAC, "Google", "Chrome", HOST_DIR_LABEL],
      regWin: [...HKCU_SOFTWARE, "Google", "Chrome", HOST_DIR_LABEL, HOST],
      type: EXT_CHROME,
    },
    chromium: {
      alias: "chromium",
      hostLinux: [DIR_HOME, ".config", "chromium", HOST_DIR_LABEL],
      hostMac: [...DIR_HOST_MAC, "Chromium", HOST_DIR_LABEL],
      regWin: null,
      type: EXT_CHROME,
    },
    firefox: {
      alias: "firefox",
      hostLinux: [DIR_HOME, ".mozilla", "native-messaging-hosts"],
      hostMac: [...DIR_HOST_MAC, "Mozilla", HOST_DIR_LABEL],
      regWin: [...HKCU_SOFTWARE, "Mozilla", HOST_DIR_LABEL, HOST],
      type: EXT_WEB,
    },
    vivaldi: {
      alias: "vivaldi",
      aliasWin: "chrome",
      hostLinux: [DIR_HOME, ".config", "vivaldi", HOST_DIR_LABEL],
      hostMac: [...DIR_HOST_MAC, "Vivaldi", HOST_DIR_LABEL],
      regWin: [...HKCU_SOFTWARE, "Google", "Chrome", HOST_DIR_LABEL, HOST],
      type: EXT_CHROME,
    },
  };

  /* allowed field */
  const allowedField = {
    [EXT_CHROME]: {
      key: EXT_CHROME_ALLOWED,
      value: [EXT_CHROME_ID],
    },
    [EXT_WEB]: {
      key: EXT_WEB_ALLOWED,
      value: [EXT_WEB_ID],
    },
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
  const setBrowser = async browser => {
    browser && Object.keys(browser).length && browser.alias &&
      (vars.browser = browser);
  };

  /**
   * set config directory
   * @param {string} dir - directory path
   * @returns {void}
   */
  const setConfigDir = async dir => {
    const configPath = await getAbsPath(dir);
    if (!configPath) {
      throw new Error(`Failed to normalize ${dir}`);
    }
    if (!configPath.startsWith(DIR_HOME)) {
      throw new Error(`Config path is not sub directory of ${DIR_HOME}.`);
    }
    const homeDir = await escapeChar(DIR_HOME, /(\\)/g);
    const reHomeDir = new RegExp(`^(?:${homeDir}|~)`);
    const subDir = (configPath.replace(reHomeDir, "")).split(path.sep)
                     .filter(i => i);
    vars.configDir = subDir.length && [DIR_HOME, ...subDir] || [DIR_HOME];
  };

  /* files */
  /* editor config */
  const editorConfig = {
    editorPath: "",
    cmdArgs: [],
    fileAfterCmdArgs: false,
  };

  /**
   * create editor config
   * @param {string} configPath - config directory path
   * @returns {string} - editor config path
   */
  const createEditorConfig = async configPath => {
    if (await !isDir(configPath)) {
      throw new Error(`No such directory: ${configPath}.`);
    }
    const editorConfigPath = path.join(configPath, "editorconfig.json");
    await createFile(
      editorConfigPath, JSON.stringify(editorConfig, null, "  "),
      {encoding: CHAR, flag: "w", mode: PERM_FILE}
    );
    if (await !isFile(editorConfigPath)) {
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
  const createAppManifest = async (configPath, shellPath) => {
    if (await !isDir(configPath)) {
      throw new Error(`No such directory: ${configPath}.`);
    }
    if (await !isFile(shellPath)) {
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
      const hostDirPath = await createDir(hostDir, PERM_DIR);
      if (await !isDir(hostDirPath)) {
        throw new Error(`Failed to create ${path.join(...hostDir)}.`);
      }
    }
    await createFile(
      filePath, manifest,
      {encoding: CHAR, flag: "w", mode: PERM_FILE}
    );
    if (await !isFile(filePath)) {
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
  const createShellScript = async configPath => {
    if (await !isDir(configPath)) {
      throw new Error(`No such directory: ${configPath}.`);
    }
    const shellExt = IS_WIN && "cmd" || "sh";
    const shellPath = path.join(configPath, `${HOST}.${shellExt}`);
    const indexPath = path.resolve(path.join(DIR_CWD, "index.js"));
    if (await isFile(indexPath)) {
      const node = process.argv0;
      const cmd = `${node} ${indexPath}`;
      const file = IS_WIN && `@echo off\n${cmd}\n` ||
                   `#!/usr/bin/env bash\n${cmd}\n`;
      await createFile(
        shellPath, file,
        {encoding: CHAR, flag: "w", mode: PERM_EXEC}
      );
    }
    if (await !isFile(shellPath)) {
      throw new Error(`Failed to create ${shellPath}.`);
    }
    console.info(`Created: ${shellPath}`);
    return shellPath;
  };

  /**
   * create config directory
   * @returns {string} - config directory path
   */
  const createConfig = async () => {
    const {browser, configDir} = vars;
    const {alias, aliasLinux, aliasMac, aliasWin} = browser;
    const dir = IS_WIN && [...configDir, aliasWin || alias] ||
                IS_MAC && [...configDir, aliasMac || alias] ||
                [...configDir, aliasLinux || alias];
    const configPath = await createDir(dir, PERM_DIR);
    if (await !isDir(configPath)) {
      throw new Error(`Failed to create ${path.join(dir)}.`);
    }
    console.info(`Created: ${configPath}`);
    return configPath;
  };

  /**
   * setup
   * @returns {Promise.<Array>} - results of each handler
   */
  const setup = async () => {
    const configPath = await createConfig();
    const shellPath = await createShellScript(configPath);
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
   * get browser config
   * @param {string} key - key
   * @returns {Object} - browser config
   */
  const getBrowserConfig = key => {
    let browser;
    key = isString(key) && key.toLowerCase().trim();
    if (key) {
      const items = Object.keys(browserConfig);
      for (const item of items) {
        if (item === key) {
          browser = browserConfig[item];
          break;
        }
      }
    }
    return browser || null;
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
   * handle browser input
   * @param {string} ans - user input
   * @returns {void}
   */
  const handleBrowserInput = ans => {
    if (isString(ans)) {
      ans = ans.trim();
      if (ans.length) {
        const browser = getBrowserConfig(ans);
        if (browser) {
          setBrowser(browser);
          rl.question(ques.editorPath, handleEditorPathInput);
        } else {
          // TODO: Add custom setup
          abortSetup(`${ans} not supported.`);
        }
      } else {
        abortSetup("Browser not specified.");
      }
    } else {
      abortSetup("Browser not specified.");
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

  {
    const [, , ...args] = process.argv;
    let browser;
    if (Array.isArray(args) && args.length) {
      const func = [];
      for (const arg of args) {
        let value;
        if (/^--browser=/i.test(arg)) {
          value = extractArg(arg, /^--browser=(.+)$/i);
          value && (browser = getBrowserConfig(value));
          browser && func.push(setBrowser(browser));
        } else if (/^--config-path=/i.test(arg)) {
          value = extractArg(arg, /^--config-path=(.+)$/i);
          value && func.push(setConfigDir(value));
        }
      }
      Promise.all(func).catch(logError);
    }
    browser ?
      rl.question(ques.editorPath, handleEditorPathInput) :
      rl.question(`${ques.browser}[${Object.keys(browserConfig).join(" ")}]\n`,
                  handleBrowserInput);
  }
}
