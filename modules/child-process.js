/**
 * child-process.js
 */
"use strict";
{
  /* api */
  const {escapeChar, getType, isString, quoteArg} = require("./common");
  const {isExecutable} = require("./file-util");
  const childProcess = require("child_process");
  const process = require("process");

  /**
   * correct argument string
   * @param {string} arg - argument
   * @returns {string} - argument
   */
  const correctArg = arg => {
    if (isString(arg)) {
      if (/^\s*(?:".*"|'.*')\s*$/.test(arg)) {
        arg = arg.trim();
        /^".*\\["\\].*"$/.test(arg) &&
          (arg = arg.replace(/\\"/g, "\"").replace(/\\\\/g, "\\"));
        arg = arg.replace(/^['"]/, "").replace(/["']$/, "");
      } else {
        /^.*\\.*$/.test(arg) && (arg = arg.replace(/\\(?!\\)/g, ""));
        /".*"|'.*'/.test(arg) && (
          arg = arg.replace(/"([^"]+)*"|'([^']+)*'/g, (m, c1, c2) => c1 || c2)
        );
      }
    } else {
      arg = "";
    }
    return arg;
  };

  /**
   * extract argument
   * @param {string} arg - argument
   * @returns {Array} - arguments array
   */
  const extractArg = arg => {
    let arr;
    if (isString(arg) && (arg = escapeChar(arg, /(\\)/g))) {
      const reCmd = /(?:^|\s)(?:"(?:[^"\\]|\\[^"]|\\")*"|'(?:[^'\\]|\\[^']|\\')*')(?=\s|$)|(?:\\ |[^\s])+(?:"(?:[^"\\]|\\[^"]|\\")*"|'(?:[^'\\]|\\[^']|\\')*')(?:(?:\\ |[^\s])+(?:"(?:[^"\\]|\\[^"]|\\")*"|'(?:[^'\\]|\\[^']|\\')*'))*(?:\\ |[^\s])*|(?:[^"'\s\\]|\\[^\s]|\\ )+/g;
      arr = arg.match(reCmd);
    }
    return Array.isArray(arr) && arr.map(correctArg) || [];
  };

  /**
   * stringify argument string
   * @param {string} arg - argument
   * @returns {string} - argument
   */
  const stringifyArg = arg => {
    if (isString(arg)) {
      if (/["'\\\s]/.test(arg)) {
        const str = escapeChar(arg, /(["\\])/g);
        arg = str && `"${str}"` || "";
      }
    } else {
      arg = "";
    }
    return isString(arg) && arg.trim() || "";
  };

  /**
   * CmdArgs
   * @class
   */
  class CmdArgs {
    /**
     * argument input
     * @param {string|Array} input - input
     */
    constructor(input) {
      this._input = input;
    }

    /**
     * arguments to array
     * @returns {Array} - arguments array
     */
    toArray() {
      let arr;
      if (Array.isArray(this._input)) {
        arr = this._input;
      } else if (isString(this._input)) {
        const args = [this._input].map(extractArg);
        arr = args.length && args.reduce((a, b) => a.concat(b)) || [];
      }
      return arr || [];
    }

    /**
     * arguments array to string
     * @returns {string} - arguments string
     */
    toString() {
      const args = this.toArray().map(stringifyArg).join(" ");
      return isString(args) && args.trim() || "";
    }
  }

  /**
   * Child process
   * @class
   */
  class ChildProcess {
    /**
     * command, arguments and option
     * @param {string} cmd - command
     * @param {string|Array} [args] - command arguments
     * @param {Object} [opt] - options
     */
    constructor(cmd, args, opt) {
      this._cmd = isString(cmd) && cmd || null;
      this._args = Array.isArray(args) && args ||
                   isString(args) && (new CmdArgs(args)).toArray() || [];
      this._opt = getType(opt) === "Object" && opt ||
                  {cwd: null, env: process.env};
    }

    /**
     * spawn child process
     * @param {string} [file] - file
     * @param {boolean} [pos] - file after cmd args
     * @returns {Object} - child process
     */
    spawn(file, pos = false) {
      if (!isExecutable(this._cmd)) {
        throw new Error(`${this._cmd} is not executable.`);
      }
      const cmd = this._cmd;
      const opt = this._opt;
      let args;
      if (isString(file)) {
        const filePath = quoteArg(file);
        const fileArg = (new CmdArgs(filePath)).toArray();
        args = pos && this._args.concat(fileArg) || fileArg.concat(this._args);
      } else {
        args = this._args;
      }
      return childProcess.spawn(cmd, args, opt);
    }
  }

  module.exports = {
    ChildProcess, CmdArgs,
  };
}
