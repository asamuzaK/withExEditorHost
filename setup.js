/**
 * setup.js
 */
"use strict";
{
  /* api */
  const {ChildProcess, CmdArgs} = require("./modules/child-process");
  const {escapeChar, isString, logError} = require("./modules/common");
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
  const EXT_CHROME_ID = "chrome-extension://jakgdeodohnbhngonaabiaklmhfahjbj/";
  const EXT_WEB = "webExtension";
  const EXT_WEB_ALLOWED = "allowed_extensions";
  const EXT_WEB_ID = "jid1-WiAigu4HIo0Tag@jetpack";
  const HKCU_SOFTWARE = ["HKEY_CURRENT_USER", "SOFTWARE"];
  const HOST_DIR_LABEL = "NativeMessagingHosts";
  const HOST_DIR_LINUX = [DIR_HOME, ".mozilla", "native-messaging-hosts"];
  const HOST_DIR_MAC = [
    DIR_HOME, "Library", "Application Support", "Mozilla",
    "NativeMessagingHosts",
  ];
  const IS_MAC = os.platform() === "darwin";
  const IS_WIN = os.platform() === "win32";
  const PERM_DIR = 0o700;
  const PERM_EXEC = 0o700;
  const PERM_FILE = 0o600;

  /* variables */
  const vars = {
    browser: null,
    configDir: [DIR_CWD, "config"],
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
      hostLinux: [DIR_HOME, ".config", "vivaldi", HOST_DIR_LABEL],
      hostMac: [...DIR_HOST_MAC, "Vivaldi", HOST_DIR_LABEL],
      regWin: [...HKCU_SOFTWARE, "Vivaldi", HOST_DIR_LABEL, HOST],
      type: EXT_CHROME,
    },
  };

  /**
   * get browser config
   * @param {string} key - key
   * @returns {Object} - browser config
   */
  const getBrowserConfig = key => {
    let browser;
    if (isString(key) && (key = key.toLowerCase().trim())) {
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
   * get browser
   * @param {string} arg - argument
   * @returns {string} - browser label;
   */
  const getBrowser = arg => {
    let browser;
    if (isString(arg)) {
      arg = /^--browser=(.+)$/.exec(arg);
      if (arg) {
        browser = getBrowserConfig(arg[1].trim());
        browser && (vars.browser = browser);
      }
    }
    return browser && browser.alias || null;
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
    const allowed = "allowed_extensions";
    const manifest = JSON.stringify({
      [allowed]: [EXT_WEB_ID],
      description: "Native messaging host for withExEditor",
      name: HOST,
      path: shellPath,
      type: "stdio",
    });
    const fileName = `${HOST}.json`;
    const filePath = path.resolve(
      IS_WIN && path.join(configPath, fileName) ||
      IS_MAC && path.join(...HOST_DIR_MAC, fileName) ||
      path.join(...HOST_DIR_LINUX, fileName)
    );
    if (IS_WIN) {
      const reg = path.join(process.env.WINDIR, "system32", "reg.exe");
      const key = path.join(
        "HKEY_CURRENT_USER", "SOFTWARE", "Mozilla", "NativeMessagingHosts",
        HOST
      );
      const args = ["add", key, "/ve", "/d", filePath, "/f"];
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
          console.info(`Created: ${key}`);
        } else {
          console.warn(`${reg} exited with ${code}.`);
        }
      });
    } else {
      const hostDir = IS_MAC && HOST_DIR_MAC || HOST_DIR_LINUX;
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
   * set config directory
   * @param {string} arg - argument
   * @returns {void}
   */
  const setConfigDir = async arg => {
    if (await isString(arg)) {
      arg = /^--config-path=(.+)$/.exec(arg);
      if (arg && (arg = arg[1].trim())) {
        const configPath = await getAbsPath(arg);
        if (!configPath) {
          throw new Error(`Failed to normalize ${arg}`);
        }
        if (!configPath.startsWith(DIR_HOME)) {
          throw new Error(`Config path is not sub directory of ${DIR_HOME}.`);
        }
        const homeDir = await escapeChar(DIR_HOME, /(\\)/g);
        const reHomeDir = new RegExp(`^(?:${homeDir}|~)`);
        const subDir = (configPath.replace(reHomeDir, "")).split(path.sep)
                         .filter(i => i);
        if (subDir.length) {
          vars.configDir = [DIR_HOME, ...subDir];
        } else {
          vars.configDir = [DIR_HOME];
        }
      }
    }
  };

  /**
   * create config directory
   * @returns {string} - config directory path
   */
  const createConfig = async () => {
    const configPath = await createDir(vars.configDir, PERM_DIR);
    if (await !isDir(configPath)) {
      throw new Error(`Failed to create ${path.join(...vars.configDir)}.`);
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
    browser: "Enter which browser to set up the host:\n",
    cmsArgs: "Enter command line options:\n",
    editorPath: "Enter editor path:\n",
    filePos: "Put file path after command arguments? [y/n]\n",
  };

  /**
   * abort setup
   * @param {string} msg - message
   * @returns {void}
   */
  const abortSetup = msg => {
    isString(msg) && msg.length && console.info(msg);
    console.info("Setup aborted.");
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
          vars.browser = browser;
          rl.question(ques.editorPath, handleEditorPathInput);
        } else {
          abortSetup(`${ans} not supported yet.`);
          // TODO: impliment custom browser install
          /*
          const _custom = {
            alias: null,
            hostLinux: null,
            hostMac: null,
            regWin: null,
            type: null,
          };
          browserConfig._custom = _custom;
          */
        }
      } else {
        abortSetup("You need to specify the browser");
      }
    } else {
      abortSetup("You need to specify the browser");
    }
  };

  {
    const [, , ...args] = process.argv;
    let browser;
    if (Array.isArray(args) && args.length) {
      const func = [];
      for (const arg of args) {
        /^--browser=/.test(arg) && (browser = getBrowser(arg));
        /^--config-path=/.test(arg) && func.push(setConfigDir(arg));
      }
      Promise.all(func).catch(logError);
    }
    if (browser) {
      rl.question(ques.editorPath, handleEditorPathInput);
    } else {
      const items = Object.keys(browserConfig);
      rl.question(`${ques.browser}[${items.join(" ")}]\n`, handleBrowserInput);
    }
  }
}
