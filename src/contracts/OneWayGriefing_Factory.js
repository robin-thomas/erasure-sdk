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

  async createExplicit({
    counterParty,
    countdownLength,
    ratio,
    ratioType,
    hash,
    contractAddress,
    data = null
  }) {
    try {
      const accounts = await this.web3.eth.getAccounts();
      const operator = accounts[0];
      const staker = operator;

      if (!this.web3.utils.isAddress(counterParty)) {
        throw new Error(`CounterParty ${counterParty} is not an address`);
      }

      const token = this.web3.utils.isAddress(contractAddress)
        ? contractAddress
        : Contract.getAddress("NMR", this.network);
      if (!this.web3.utils.isAddress(token)) {
        throw new Error(`Token ${token} is not an address`);
      }

      // Convert the ipfs hash to multihash hex code.
      let ipfsHash = hash;
      if (data) {
        ipfsHash = await IPFS.add(data);
      }
      const staticMetadata = CryptoIPFS.ipfs.hashToHex(ipfsHash);

      const fnName = "createExplicit";
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

      const txReceipt = await this.contract.invokeFn(fnName, true, ...fnArgs);

      return {
        ipfsHash,
        txHash: txReceipt.logs[0].transactionHash,
        address: txReceipt.logs[0].address
      };
    } catch (err) {
      throw err;
    }
  }
}

export default OneWayGriefing_Factory;
