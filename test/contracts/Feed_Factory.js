import assert from "assert";

import Web3 from "../../src/utils/Web3";
import FeedFactory from "../../src/contracts/Feed_Factory";

import config from "../../src/keys.json";

describe("Feed_Factory", () => {
  const timeout = 1000 * 60 * 20; // 20 minutes
  const network = "rinkeby";
  const ipfsHash = "QmZ1ECtL9x6jinoUiiSxuSk2sfgupKKAG2BpzHWutY2DrU"; // random hash

  let web3;
  before(async () => {
    web3 = await Web3.getWeb3(null, {
      infura: config.infura.rinkeby.api,
      mnemonic: config.metamask.mnemonic
    });

    const accounts = await web3.eth.getAccounts();
    console.log(`\tUsing account: ${accounts[0]}`);
  });

  describe("#createExplicit", () => {
    it("", async () => {
      const contract = new FeedFactory({ network, web3 });

      const estimate = await contract.createExplicit({
        hash: ipfsHash,
        estimate: true
      });
      console.log(
        `\tgas estimated = ${estimate}; block gas limit = ${
          (await web3.eth.getBlock("latest")).gasLimit
        }`
      );

      const result = await contract.createExplicit({
        hash: ipfsHash
      });

      assert.ok(web3.utils.isAddress(result.address));
      console.log(`\tContract created at ${result.address}`);
    }).timeout(timeout);
  });
});
