"use strict";
{
  /* api */
  const {handleSetupCallback} = require("../modules/setup");
  const {assert} = require("chai");
  const {describe, it} = require("mocha");

  describe("handleSetupCallback", () => {
    it("should return null if no argument is given", () => {
      assert.strictEqual(handleSetupCallback(""), null);
    });

    it("should return null if argument is not an object", () => {
      assert.strictEqual(handleSetupCallback(""), null);
    });

    it("should return null if argument does not contain property", () => {
      const info = {};
      assert.strictEqual(handleSetupCallback(info), null);
    });

    it("should return null if argument property is not string type", () => {
      const info = {
        configDirPath: true,
      };
      assert.strictEqual(handleSetupCallback(info), null);
    });

    it("should return null if argument property is not a directory", () => {
      const info = {
        configDirPath: "foo/bar",
      };
      assert.strictEqual(handleSetupCallback(info), null);
    });
  });
}
