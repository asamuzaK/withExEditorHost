/**
 * js2bin-helper.js
 */
"use strict";
const {getType, isString, throwErr} = require("./common");
const {compareSemVer} = require("semver-parser");
const fetch = require("node-fetch");
const process = require("process");

/* constants */
const URL_JS2BIN = "https://api.github.com/repos/criblio/js2bin/releases";

/**
 * fetch JSON
 *
 * @param {string} url - URL
 * @returns {string} - content text
 */
const fetchJson = async url => {
  if (!isString(url)) {
    throw new TypeError(`Expected String but got ${getType(url)}.`);
  }
  const res = await fetch(url);
  const {ok, status} = res;
  if (!ok) {
    const msg = `Network response was not ok. status: ${status}`;
    throw new Error(msg);
  }
  return res.json();
};

/**
 * get latest asset version of js2bin
 *
 * @returns {?string} - version
 */
const getJs2binAssetVersion = async () => {
  let latest;
  const res = await fetchJson(URL_JS2BIN);
  if (Array.isArray(res) && res.length) {
    const [
      {
        assets,
      },
    ] = res;
    if (assets) {
      const versions = new Set();
      const versionReg = /[^.]((?:0|[1-9]?\d+)(?:\.(?:0|[1-9]?\d+)){2})[^.]/;
      for (const asset of assets) {
        const {name} = asset;
        if (versionReg.test(name)) {
          const [, version] = versionReg.exec(name);
          versions.add(version);
        }
      }
      if (versions.size) {
        const items = Array.from(versions);
        for (const item of items) {
          if (latest) {
            const result = compareSemVer(item, latest);
            if (result > 0) {
              latest = item;
            }
          } else {
            latest = item;
          }
        }
      }
    }
  }
  return latest || null;
};

/**
 * run js2bin
 *
 * @param {Array} args - process.argv
 * @returns {void}
 */
const runJs2bin = async (args = process.argv) => {
  if (Array.isArray(args) && args.includes("prebuild")) {
    const latest = await getJs2binAssetVersion();
    if (latest) {
      process.stdout.write(`--node=${latest}`);
    }
  }
};

runJs2bin().catch(throwErr);

module.exports = {
  fetchJson,
  getJs2binAssetVersion,
  runJs2bin,
};
