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

  async createExplicit(counterParty, countdownLength, { hash, data = null }) {
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
      console.log(
        `Uploaded to IPFS: hash = ${ipfsHash}, hex = ${staticMetadata}`
      );

      const txHash = await this.contract.invokeFn(
        "createExplicit",
        true,
        token,
        operator,
        staker,
        counterparty,
        ratio,
        ratioType,
        countdownLength,
        staticMetadata
      );

      // Get the address of the newly created address.
      const txReceipt = await Web3.getTxReceipt(this.web3, txHash);

      return {
        hash: ipfsHash,
        address: txReceipt.logs[0].address
      };
    } catch (err) {
      throw err;
    }
  }

  async increaseStake(stakedAmount /* in NMR */) {
    if (typeof stakedAmount !== "string" && !(stakedAmount instanceof String)) {
      stakedAmount = stakedAmount.toString();
    }

    const stake = web3.utils.toHex(web3.utils.toWei(stakedAmount, "ether"));

    await this.contract.invokeFn("createExplicit", true, 0, stake);
  }
}

export default OneWayGriefing_Factory;
