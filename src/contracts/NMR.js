import CryptoIPFS from "@erasure/crypto-ipfs";

import Web3 from "../utils/Web3";
import Contract from "../utils/Contract";

import contract from "../../artifacts/NMR.json";

class NMR {
  constructor({ network, web3 }) {
    this.web3 = web3;

    this.contract = new Contract({
      network,
      web3,
      abi: contract.abi,
      contract: "NMR"
    });
  }

  async changeApproval() {
    try {
      const accounts = await this.web3.eth.getAccounts();
      const spender = accounts[0];

      await this.contract.invokeFn(
        "changeApproval",
        true,
        spender,
        0,
        -1 /* max uint256 value */
      );
    } catch (err) {
      throw err;
    }
  }
}

export default NMR;
