/**
 * child-process.js
 */
"use strict";
{
  /* api */
  const {getType, isString} = require("./common");
  const {isExecutable} = require("./file-util");
  const childProcess = require("child_process");
  const process = require("process");

  /**
   * escape matching char
   * @param {string} str - argument
   * @param {RegExp} re - RegExp
   * @returns {?string} - string
   */
  const escapeChar = (str, re) =>
    isString(str) && re && re.global &&
    str.replace(re, (m, c) => `\\${c}`) || null;

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

  /* CmdArgs */
  class CmdArgs {
    /**
     * argument input
     * @param {string|Array} input - input
     */
    constructor(...input) {
      this._input = input;
    }

    /**
     * arguments to array
     * @returns {Array} - arguments array
     */
    toArray() {
      const args = Array.isArray(this._input) &&
                   this._input.map(extractArg) || [];
      return args.length && args.reduce((a, b) => a.concat(b)) || [];
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

  /* Child process */
  class ChildProcess {
    /**
     * command, arguments and option
     * @param {string} cmd - command
     * @param {string|Array} args - command arguments
     * @param {Object} opt - option
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
     * @param {string} file - file
     * @param {boolean} pos - file after cmd args
     * @returns {Object} - child process
     */
    spawn(file, pos = false) {
      if (!isExecutable(this._cmd)) {
        throw new Error(`${this._cmd} is not executable.`);
      }
      const cmd = this._cmd;
      const fileArg = (new CmdArgs(file)).toArray();
      const args = isString(file) && (
                     pos && this._args.concat(fileArg) ||
                     fileArg.concat(this._args)
                   ) || this._args;
      const opt = this._opt;
      return childProcess.spawn(cmd, args, opt);
    }
  }

  module.exports = {
    ChildProcess, CmdArgs,
  };
}
