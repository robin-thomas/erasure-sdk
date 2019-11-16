import CryptoIPFS from "@erasure/crypto-ipfs";

import Contract from "../utils/Contract";

import contract from "../../artifacts/NMR.json";
import mockContract from "../../artifacts/MockNMR.json";

class NMR {
  constructor({ network, web3 }) {
    this.web3 = web3;

    this.contract = new Contract({
      network,
      web3,
      abi: network === "rinkeby" ? mockContract.abi : contract.abi,
      contract: "NMR"
    });
  }

  async changeApproval(spender, estimate = false) {
    try {
      const fnName = "changeApproval";
      const fnArgs = [spender, 0, -1 /* max uint256 value */];

      if (estimate) {
        return await this.contract.estimateGas(fnName, ...fnArgs);
      }

      return await this.contract.invokeFn(fnName, true, ...fnArgs);
    } catch (err) {
      throw err;
    }
  }
}

export default NMR;
