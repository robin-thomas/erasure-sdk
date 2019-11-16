import CryptoIPFS from "@erasure/crypto-ipfs";

import Web3 from "../utils/Web3";
import IPFS from "../utils/IPFS";
import Contract from "../utils/Contract";

import contract from "../../artifacts/OneWayGriefing.json";

class OneWayGriefing {
  constructor({ network, web3 }) {
    this.web3 = web3;
    this.network = network;

    this.contract = new Contract({
      network,
      web3,
      abi: contract.abi,
      contract: "OneWayGriefing"
    });
  }

  setAddress(address) {
    this.contract = this.contract.setContract(contract.abi, address);
  }

  // in NMR
  async increaseStake(stakeAmount) {
    try {
      if (typeof stakeAmount !== "string" && !(stakeAmount instanceof String)) {
        stakeAmount = stakeAmount.toString();
      }

      const stake = this.web3.utils.toWei(stakeAmount, "ether");

      const fnName = "increaseStake";
      const fnArgs = [
        0, // current stake
        stake // new stake
      ];

      return await this.contract.invokeFn(fnName, true, ...fnArgs);
    } catch (err) {
      throw err;
    }
  }
}

export default OneWayGriefing;
