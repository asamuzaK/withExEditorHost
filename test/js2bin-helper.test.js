/* eslint-disable array-bracket-newline, no-magic-numbers */
"use strict";
const {
  fetchJson, getJs2binAssetVersion, runJs2bin,
} = require("../modules/js2bin-helper");
const {assert} = require("chai");
const {describe, it} = require("mocha");
const fetch = require("node-fetch");
const process = require("process");
const sinon = require("sinon");

describe("fetch JSON", () => {
  it("should throw", async () => {
    await fetchJson().catch(e => {
      assert.instanceOf(e, TypeError, "error");
      assert.strictEqual(e.message, "Expected String but got Undefined.");
    });
  });

  it("should throw", async () => {
    const stubFetch = sinon.stub(fetch, "Promise").resolves({});
    await fetchJson("https://example.com").catch(e => {
      assert.instanceOf(e, Error, "error");
      assert.strictEqual(e.message,
                         "Network response was not ok. status: undefined");
    });
    stubFetch.restore();
  });

  it("should throw", async () => {
    const stubFetch = sinon.stub(fetch, "Promise").resolves({
      ok: false,
      status: 404,
    });
    await fetchJson("https://example.com").catch(e => {
      assert.instanceOf(e, Error, "error");
      assert.strictEqual(e.message,
                         "Network response was not ok. status: 404");
    });
    stubFetch.restore();
  });

  it("should get result", async () => {
    const stubFetch = sinon.stub(fetch, "Promise").resolves({
      ok: true,
      status: 200,
      json: () => [],
    });
    const res = await fetchJson("https://example.com");
    stubFetch.restore();
    assert.deepEqual(res, [], "result");
  });
});

describe("get latest asset version of js2bin", () => {
  it("should get null", async () => {
    const stubFetch = sinon.stub(fetch, "Promise").resolves({
      ok: true,
      status: 200,
      json: () => "",
    });
    const res = await getJs2binAssetVersion();
    stubFetch.restore();
    assert.isNull(res, "result");
  });

  it("should get null", async () => {
    const stubFetch = sinon.stub(fetch, "Promise").resolves({
      ok: true,
      status: 200,
      json: () => [],
    });
    const res = await getJs2binAssetVersion();
    stubFetch.restore();
    assert.isNull(res, "result");
  });

  it("should get null", async () => {
    const stubFetch = sinon.stub(fetch, "Promise").resolves({
      ok: true,
      status: 200,
      json: () => [{}],
    });
    const res = await getJs2binAssetVersion();
    stubFetch.restore();
    assert.isNull(res, "result");
  });

  it("should get null", async () => {
    const stubFetch = sinon.stub(fetch, "Promise").resolves({
      ok: true,
      status: 200,
      json: () => [{
        assets: [],
      }],
    });
    const res = await getJs2binAssetVersion();
    stubFetch.restore();
    assert.isNull(res, "result");
  });

  it("should get null", async () => {
    const stubFetch = sinon.stub(fetch, "Promise").resolves({
      ok: true,
      status: 200,
      json: () => [{
        assets: [{}],
      }],
    });
    const res = await getJs2binAssetVersion();
    stubFetch.restore();
    assert.isNull(res, "result");
  });

  it("should get null", async () => {
    const stubFetch = sinon.stub(fetch, "Promise").resolves({
      ok: true,
      status: 200,
      json: () => [{
        assets: [{name: "foo"}, {name: "bar"}],
      }],
    });
    const res = await getJs2binAssetVersion();
    stubFetch.restore();
    assert.isNull(res, "result");
  });

  it("should get result", async () => {
    const stubFetch = sinon.stub(fetch, "Promise").resolves({
      ok: true,
      status: 200,
      json: () => [{
        assets: [
          {name: "v1.0.0-foo"},
          {name: "v1.2.3-bar"},
          {name: "v1.1.1-baz"},
        ],
      }],
    });
    const res = await getJs2binAssetVersion();
    stubFetch.restore();
    assert.strictEqual(res, "1.2.3", "result");
  });
});

describe("run js2bin", () => {
  it("should not call", async () => {
    const stubWrite = sinon.stub(process.stdout, "write");
    await runJs2bin(["foo", "bar"]);
    const {called} = stubWrite;
    stubWrite.restore();
    assert.isFalse(called, "not called");
  });

  it("should not call", async () => {
    const stubFetch = sinon.stub(fetch, "Promise").resolves({
      ok: true,
      status: 200,
      json: () => [{
        assets: [],
      }],
    });
    const spyWrite = sinon.spy(process.stdout, "write");
    await runJs2bin(["foo", "bar", "prebuild"]);
    const {called} = spyWrite;
    stubFetch.restore();
    spyWrite.restore();
    assert.isFalse(called, "not called");
  });

  it("should call", async () => {
    const stubFetch = sinon.stub(fetch, "Promise").resolves({
      ok: true,
      status: 200,
      json: () => [{
        assets: [
          {name: "v1.0.0-foo"},
          {name: "v1.2.3-bar"},
          {name: "v1.1.1-baz"},
        ],
      }],
    });
    const stubWrite = sinon.stub(process.stdout, "write");
    await runJs2bin(["foo", "bar", "prebuild"]);
    const {calledOnce} = stubWrite;
    stubFetch.restore();
    stubWrite.restore();
    assert.isTrue(calledOnce, "called");
  });
});
