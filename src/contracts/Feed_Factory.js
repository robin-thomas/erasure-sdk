import CryptoIPFS from "@erasure/crypto-ipfs";

import Abi from "../utils/Abi";
import IPFS from "../utils/IPFS";
import Ethers from "../utils/Ethers";
import Contract from "../utils/Contract";

import contract from "../../artifacts/Feed_Factory.json";

class Feed_Factory {
  /**
   * Feed_Factory
   *
   * @constructor
   * @param {Object} config - configuration for Feed_Factory
   * @param {Object} [config.registry] - for testing purposes
   */
  constructor({ registry }) {
    this.contract = new Contract({
      abi: contract.abi,
      contractName: "Feed_Factory",
      registry
    });
  }

  /**
   * Login to metamask
   *
   */
  login() {
    this.contract.login();
  }

  /**
   * Create a Feed contract using Feed_Factory
   *
   * @param {Object} config - configuration for createExplicit
   * @param {string} [config.hash] - IPFS hash of ErasureFeed version
   * @param {string} [config.data] - data of ErasureFeed version to be uploaded to IPFS
   * @returns {Promise} ipfsHash, txHash and address of new feed
   */
  async create({ hash, data = null }) {
    try {
      const operator = await Ethers.getAccount();

      // Convert the ipfs hash to multihash hex code.
      let ipfsHash = hash;
      if (data) {
        ipfsHash = await IPFS.add(data);
      }
      const feedStaticMetadata = CryptoIPFS.ipfs.hashToHex(ipfsHash);

      const callData = Abi.abiEncodeWithSelector(
        "initialize",
        ["address", "bytes", "bytes"],
        [operator, feedStaticMetadata, feedStaticMetadata]
      );

      // Creates the contract.
      const tx = await this.contract.contract.create(callData);
      const txReceipt = await tx.wait();

      return {
        ipfsHash,
        txHash: tx.hash,
        address: txReceipt.logs[0].address
      };
    } catch (err) {
      throw err;
    }
  }
}

export default Feed_Factory;
