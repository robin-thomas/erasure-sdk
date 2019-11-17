import CryptoIPFS from "@erasure/crypto-ipfs";

import IPFS from "../utils/IPFS";
import Utils from "../utils/Utils";
import Contract from "../utils/Contract";

import contract from "../../artifacts/Feed.json";

class Feed {
  /**
   * Feed
   *
   * @constructor
   * @param {Object} config - configuration for Feed
   * @param {string} config.network - eth network string
   */
  constructor({ network }) {
    this.network = network;

    this.contract = new Contract({
      network,
      abi: contract.abi,
      contractName: "Feed"
    });
  }

  /**
   * Updates the address of the contract
   *
   * @param {string} address - address of the new contract instance
   */
  setAddress(address) {
    this.contract = this.contract.setContract(contract.abi, address);
  }

  /**
   * Submits a new post to the feed
   *
   * @param {Object} metadata - post metadata
   * @returns {Promise} ipfsHash, txHash and address of new feed
   */
  async submitHash(metadata) {
    const ipfsHash = await IPFS.add(JSON.stringify(metadata));
    const hex = Utils.hash(ipfsHash);

    // submits the new post hash
    const tx = await this.contract.contract.submitHash(hex);
    const txReceipt = await tx.wait();

    return txReceipt;
  }
}

export default Feed;
