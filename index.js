/**
 * index.js
 */
"use strict";
/* api */
const {logErr, throwErr} = require("./modules/common");
const {startup} = require("./modules/main");
const {runCommander} = require("./modules/commander");
const process = require("process");

/* process */
process.on("uncaughtException", throwErr);
process.on("unhandledRejection", logErr);

/* startup */
(() => {
  const [, , ...args] = process.argv;
  let func, setup, ver;
  if (Array.isArray(args) && args.length) {
    for (const arg of args) {
      if (/^s(?:etup)?$/i.test(arg)) {
        setup = true;
        break;
      } else if (/^(?:-v|--version)$/i.test(arg)) {
        ver = true;
        break;
      }
    }
  }
  if (setup || ver) {
    func = runCommander();
  } else {
    func = startup();
  }
  return func;
})();
