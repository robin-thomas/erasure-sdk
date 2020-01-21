import assert from "assert";

import ErasureClient from "./index";

import Deployer from "../../test/deploy";

describe("ErasureClient", () => {
  before(async () => {
    try {
      await Deployer();
      await ErasureClient();
    } catch (err) {
      assert.fail(err);
    }
  });

  it("dummy", () => {
    console.log("dummy");
  });
});
