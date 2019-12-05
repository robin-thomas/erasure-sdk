import { ethers } from "ethers";
import CryptoIPFS from "@erasure/crypto-ipfs";

import IPFS from "../utils/IPFS";
import Ethers from "../utils/Ethers";
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
  async submitHash(proofHash) {
    // submits the new post hash
    const tx = await this.contract.contract.submitHash(proofHash);
    return await tx.wait();
  }

  async getPosts() {
    let provider = Ethers.getProvider();
    if (process.env.NODE_ENV === "test") {
      provider = new ethers.providers.JsonRpcProvider();
    }

    let results = await provider.getLogs({
      address: this.contract.getAddress(),
      topics: [ethers.utils.id("HashSubmitted(bytes32)")],
      fromBlock: 0
    });

    let posts = [];
    if (results && results.length > 1) {
      // First proofHash is that of feed creation.
      // so we can ignore it.
      results = results.slice(1);

      for (const result of results) {
        posts.push({
          proofHash: result.data,
          ipfsMultihash: IPFS.sha256ToHash(result.data)
        });
      }
    }

    return posts;
  }
}

export default Feed;
