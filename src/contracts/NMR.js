import CryptoIPFS from "@erasure/crypto-ipfs";

import Contract from "../utils/Contract";

import contract from "../../artifacts/NMR.json";
import mockContract from "../../artifacts/MockNMR.json";

class NMR {
  constructor({ network, web3 }) {
    this.web3 = web3;
    this.network = network;

    this.contract = new Contract({
      network,
      web3,
      abi: network === "rinkeby" ? mockContract.abi : contract.abi,
      contract: "NMR"
    });
  }

  async changeApproval(spender) {
    try {
      const fnName = "changeApproval";
      const fnArgs = [spender, 0, -1 /* max uint256 value */];

      return await this.contract.invokeFn(fnName, true, ...fnArgs);
    } catch (err) {
      throw err;
    }
  }
}

export default NMR;
