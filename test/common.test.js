"use strict";
{
  /* api */
  const {
    escapeChar, getType, isString, logErr, logMsg, logWarn,
    stringifyPositiveInt, stripHtmlTags, throwErr,
  } = require("../modules/common");
  const {assert} = require("chai");
  const {describe, it} = require("mocha");

  describe("escapeChar", () => {
    it("should get escaped string", () => {
      const c = "abc";
      const re = /(b)/ig;
      assert.strictEqual(escapeChar(c, re), "a\\bc");
    });

    it("should get null if string is not given", () => {
      const re = /(b)/ig;
      assert.isNull(escapeChar(1, re));
    });

    it("should get null if regexp is not given", () => {
      const c = "abc";
      assert.isNull(escapeChar(c));
    });
  });

  describe("getType", () => {
    it("should get Undefined", () => {
      assert.strictEqual(getType(), "Undefined");
    });

    it("should get Null", () => {
      assert.strictEqual(getType(null), "Null");
    });

    it("should get Object", () => {
      assert.strictEqual(getType({}), "Object");
    });

    it("should get Array", () => {
      assert.strictEqual(getType([]), "Array");
    });

    it("should get Boolean", () => {
      assert.strictEqual(getType(true), "Boolean");
    });

    it("should get Number", () => {
      assert.strictEqual(getType(1), "Number");
    });

    it("should get String", () => {
      assert.strictEqual(getType("a"), "String");
    });
  });

  describe("isString", () => {
    it("should get true if string is given", () => {
      assert.strictEqual(isString("a"), true);
    });

    it("should get false if given argument is not string", () => {
      assert.strictEqual(isString(1), false);
    });
  });

  describe("logErr", () => {
    it("should get false", () => {
      const e = new Error("Log Error test");
      assert.strictEqual(logErr(e), false);
    });
  });

  describe("logMsg", () => {
    it("should get string", () => {
      const msg = "Log message test";
      assert.strictEqual(logMsg(msg), msg);
    });
  });

  describe("logWarn", () => {
    it("should get false", () => {
      const e = "Log warn test";
      assert.strictEqual(logWarn(e), false);
    });
  });

  describe("stringifyPositiveInt", () => {
    it("should get string", () => {
      assert.strictEqual(stringifyPositiveInt(1), "1");
    });

    it("should get null if given argument is not positive integer", () => {
      assert.isNull(stringifyPositiveInt());
    });

    it("should get null if 0 is given", () => {
      assert.isNull(stringifyPositiveInt(0));
    });

    it("should treat 0 as positive integer if second argument is true", () => {
      assert.strictEqual(stringifyPositiveInt(0, true), "0");
    });
  });

  describe("stripHtmlTags", () => {
    it("should strip HTML tags", () => {
      const p = "<p>test</p>";
      assert.strictEqual(stripHtmlTags(p), "test\n");
    });

    it("should decode HTML entities", () => {
      const p = "&amp;&lt;&gt;&quot;";
      assert.strictEqual(stripHtmlTags(p), "&<>\"");
    });
  });

  describe("throwErr", () => {
    it("should throw", () => {
      const e = new Error("Error");
      assert.throws(() => throwErr(e));
    });
  });
}
