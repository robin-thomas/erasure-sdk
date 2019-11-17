import CryptoIPFS from "@erasure/crypto-ipfs";

import Web3 from "../utils/Web3";
import IPFS from "../utils/IPFS";
import Contract from "../utils/Contract";

import contract from "../../artifacts/OneWayGriefing_Factory.json";

class OneWayGriefing_Factory {
  /**
   * OneWayGriefing_Factory
   *
   * @constructor
   * @param {Object} config - configuration for OneWayGriefing_Factory
   * @param {string} config.network - eth network string
   * @param {Object} config.web3 - web3 object
   */
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

  /**
   * Create a Feed contract using Feed_Factory
   *
   * @param {Object} config - configuration for createExplicit
   * @param {string} config.counterParty - party with whom the agreement to be made
   * @param {string} config.countdownLength - duration of the agreement in seconds
   * @param {string} [config.ratio] - griefing ratio
   * @param {string} [config.ratioType] - griefing ratio type
   * @param {string} [config.contractAddress] - for mocha test (to get Mock NMR tokens)
   * @param {string} [config.hash] - IPFS hash of ErasureAgreement version
   * @param {string} [config.data] - data of ErasureAgreement version to be uploaded to IPFS
   * @returns {Promise} ipfsHash, txHash and address of new feed
   */
  async createExplicit({
    counterParty,
    countdownLength,
    ratio,
    ratioType,
    hash,
    data = null,
    contractAddress
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
