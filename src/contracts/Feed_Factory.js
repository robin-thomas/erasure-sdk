import CryptoIPFS from "@erasure/crypto-ipfs";

import Web3 from "../utils/Web3";
import IPFS from "../utils/IPFS";
import Contract from "../utils/Contract";

import contract from "../../artifacts/Feed_Factory.json";

class Feed_Factory {
  /**
   * Feed_Factory
   *
   * @constructor
   * @param {Object} config - configuration for Feed_Factory
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
      contract: "Feed_Factory"
    });
  }

  /**
   * Create a Feed contract using Feed_Factory
   *
   * @param {Object} config - configuration for createExplicit
   * @param {string} [config.hash] - IPFS hash of ErasureFeed version
   * @param {string} [config.data] - data of ErasureFeed version to be uploaded to IPFS
   * @returns {Promise} ipfsHash, txHash and address of new feed
   */
  async createExplicit({ hash, data = null }) {
    try {
      const accounts = await this.web3.eth.getAccounts();
      const operator = accounts[0];

      const postRegistry = Contract.getAddress("Erasure_Posts", this.network);
      if (!this.web3.utils.isAddress(postRegistry)) {
        throw new Error(`PostRegistry ${postRegistry} is not an address`);
      }

      // Convert the ipfs hash to multihash hex code.
      let ipfsHash = hash;
      if (data) {
        ipfsHash = await IPFS.add(data);
      }
      const feedStaticMetadata = CryptoIPFS.ipfs.hashToHex(ipfsHash);

      const fnArgs = [operator, postRegistry, feedStaticMetadata];

      // Creates the contract.
      const txReceipt = await this.contract.invokeFn(
        "createExplicit",
        true,
        ...fnArgs
      );

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

export default Feed_Factory;
