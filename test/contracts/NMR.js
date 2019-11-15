import assert from "assert";

import Web3 from "../../src/utils/Web3";
import NMR from "../../src/contracts/NMR";

import config from "../../src/keys.json";

describe("NMR", () => {
  const timeout = 1000 * 60 * 20; // 20 minutes
  const network = "rinkeby";

  let web3;
  before(async () => {
    web3 = await Web3.getWeb3(null, {
      infura: config.infura.rinkeby.api,
      mnemonic: config.metamask.mnemonic
    });

    const accounts = await web3.eth.getAccounts();
    console.log(`\tUsing account: ${accounts[0]}`);
  });

  describe("#changeApproval", () => {
    it("", async () => {
      const contract = new NMR({ network, web3 });

      const estimate = await contract.changeApproval(true /* estimate */);
      console.log(
        `\tgas estimated = ${estimate}; block gas limit = ${
          (await web3.eth.getBlock("latest")).gasLimit
        }`
      );

      // const result = await contract.changeApproval();
      //
      // assert.ok(web3.utils.isAddress(result.address));
      // console.log(`\tContract created at ${result.address}`);
    }).timeout(timeout);
  });
});
