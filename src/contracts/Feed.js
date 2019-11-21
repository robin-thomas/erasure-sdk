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
   * @param {Object} [config.registry] - for testing purposes
   */
  constructor({ registry }) {
    this.contract = new Contract({
      abi: contract.abi,
      contractName: "Feed",
      registry
    });
  }

  /**
   * Login to metamask
   *
   */
  async login() {
    return await this.contract.login();
  }

  /**
   * Updates the address of the contract
   *
   * @param {string} address - address of the new contract instance
   */
  setAddress(address) {
    this.contract.setContract(address);
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
    console.log(`IPFS | ${ipfsHash} | ${hex}`);

    // submits the new post hash
    const tx = await this.contract.contract.submitHash(hex);
    const txReceipt = await tx.wait();

    return txReceipt;
  }
}

export default Feed;
