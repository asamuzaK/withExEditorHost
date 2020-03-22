"use strict";
/* api */
const {
  runCommander,
} = require("../modules/commander");
const {assert} = require("chai");
const {describe, it} = require("mocha");

describe("runCommander", () => {
  it("should not throw", () => {
    assert.doesNotThrow(() => runCommander());
  });
});
