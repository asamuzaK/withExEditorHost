"use strict";
/* api */
const {
  commander, parseCommand,
} = require("../modules/commander");
const {assert} = require("chai");
const {describe, it} = require("mocha");
const sinon = require("sinon");

describe("parse command", () => {
  const func = parseCommand;

  it("should not parse", () => {
    const stubParse = sinon.stub(commander, "parse");
    const i = stubParse.callCount;
    func();
    assert.strictEqual(stubParse.callCount, i, "not called");
    stubParse.restore();
  });

  it("should not parse", () => {
    const stubParse = sinon.stub(commander, "parse");
    const i = stubParse.callCount;
    func([]);
    assert.strictEqual(stubParse.callCount, i, "not called");
    stubParse.restore();
  });

  it("should not parse", () => {
    const stubParse = sinon.stub(commander, "parse");
    const i = stubParse.callCount;
    func(["foo", "bar", "baz"]);
    assert.strictEqual(stubParse.callCount, i, "not called");
    stubParse.restore();
  });

  it("should parse", () => {
    const stubParse = sinon.stub(commander, "parse");
    const stubVer = sinon.stub(commander, "version");
    const i = stubParse.callCount;
    const j = stubVer.callCount;
    func(["foo", "bar", "-v"]);
    assert.strictEqual(stubParse.callCount, i + 1, "called");
    assert.strictEqual(stubVer.callCount, j + 1, "called");
    stubParse.restore();
    stubVer.restore();
  });
});
