import CryptoIPFS from "@erasure/crypto-ipfs";

import Web3 from "../utils/Web3";
import IPFS from "../utils/IPFS";
import Contract from "../utils/Contract";

import contract from "../../artifacts/OneWayGriefing_Factory.json";

class OneWayGriefing_Factory {
  constructor({ network, web3 }) {
    this.web3 = web3;
    this.network = network;

    this.contract = new Contract({
      network,
      web3,
      abi: contract.abi,
      contract: "OneWayGriefing_Factory"
    });
  }

  setAddress(address) {
    this.contract = new Contract({
      network,
      web3,
      abi: contract.abi,
      contract: address
    });

    return this;
  }

  async createExplicit({
    counterParty,
    countdownLength,
    ratio,
    ratioType,
    hash,
    data = null,
    estimate = false
  }) {
    try {
      const accounts = await this.web3.eth.getAccounts();
      const operator = accounts[0];
      const staker = operator;

      if (!this.web3.utils.isAddress(counterParty)) {
        throw new Error(`CounterParty ${counterParty} is not an address`);
      }

      const token = Contract.getAddress("NMR", this.network);
      if (!this.web3.utils.isAddress(token)) {
        throw new Error(`Token ${token} is not an address`);
      }

      // Convert the ipfs hash to multihash hex code.
      let ipfsHash = hash;
      if (data) {
        ipfsHash = await IPFS.upload(data);
      }
      const staticMetadata = CryptoIPFS.ipfs.hashToHex(ipfsHash);
      console.log(`IPFS: hash = ${ipfsHash}, hex = ${staticMetadata}`);

      const fnArgs = [
        token,
        operator,
        staker,
        counterParty,
        ratio,
        ratioType,
        countdownLength,
        staticMetadata
      ];

      if (estimate) {
        return await this.contract.estimateGas("createExplicit", ...fnArgs);
      }

      const txReceipt = await this.contract.invokeFn(
        "createExplicit",
        true,
        ...fnArgs
      );

      return {
        hash: ipfsHash,
        txHash: txReceipt.logs[0].transactionHash,
        address: txReceipt.logs[0].address
      };
    } catch (err) {
      throw err;
    }
  }

  async increaseStake(stakeAmount /* in NMR */, estimate = false) {
    if (typeof stakeAmount !== "string" && !(stakeAmount instanceof String)) {
      stakeAmount = stakeAmount.toString();
    }

    const stake = web3.utils.toHex(web3.utils.toWei(stakeAmount, "ether"));

    const fnName = "increaseStake";
    const fnArgs = [
      0, // current stake
      stake // new stake
    ];

    if (estimate) {
      return await this.contract.estimateGas(fnName, ...fnArgs);
    }

    return await this.contract.invokeFn(fnName, true, ...fnArgs);
  }
}

export default OneWayGriefing_Factory;
