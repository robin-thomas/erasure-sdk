import { ethers } from "ethers";

import Box from "../utils/3Box";
import IPFS from "../utils/IPFS";
import Crypto from "../utils/Crypto";
import Ethers from "../utils/Ethers";
import ErasurePost from "./ErasurePost";

import contract from "../../artifacts/Feed.json";

const crypto = async post => {
  const keypair = await Box.getKeyPair();
  if (keypair === null) {
    throw new Error("Cannot find the keypair of this user!");
  }

  const symmetricKey = Crypto.symmetric.genKey();
  const encryptedPost = Crypto.symmetric.encrypt(symmetricKey, post);
  const encryptedPostIpfsHash = await IPFS.add(encryptedPost);

  // Nonce is set per post.
  const nonce = Crypto.asymmetric.genNonce();
  const encryptedSymmetricKey = Crypto.asymmetric.encrypt(
    symmetricKey,
    nonce,
    keypair
  );

  return {
    nonce: nonce.toString(),
    encryptedSymmetricKey: encryptedSymmetricKey.toString(),
    encryptedPostIpfsHash
  };
};

class ErasureFeed {
  #owner = null;
  #contract = null;
  #feedAddress = null;
  #protocolVersion = "";

  /**
   * @constructor
   * @param {Object} config
   * @param {string} config.owner
   * @param {string} config.feedAddress
   * @param {string} config.protocolVersion
   */
  constructor({ owner, feedAddress, protocolVersion }) {
    this.#owner = owner;
    this.#feedAddress = feedAddress;
    this.#protocolVersion = protocolVersion;

    this.#contract = new ethers.Contract(
      feedAddress,
      contract.abi,
      Ethers.getWallet()
    );

    // Listen for any metamask changes.
    if (typeof window !== "undefined" && window.ethereum !== undefined) {
      window.ethereum.on("accountsChanged", function() {
        this.#contract = new ethers.Contract(
          feedAddress,
          contract.abi,
          Ethers.getWallet()
        );
      });
    }
  }

  /**
   * Access the web3 contract class
   */
  contract = () => {
    return this.#contract;
  };

  /**
   * Get the address of this feed
   *
   * @returns {address} address of the feed
   */
  address = () => {
    return this.#feedAddress;
  };

  /**
   * Get the address of the owner of this feed
   *
   * @returns {address} address of the owner
   */
  owner = () => {
    return this.#owner;
  };

  /**
   * Submit new data to this feed
   * - can only called by feed owner
   *
   * @param {string} data - raw data to be posted
   * @returns {Promise<PostWithReceipt>}
   */
  createPost = async data => {
    try {
      const operator = await Ethers.getAccount();
      if (Ethers.getAddress(operator) !== Ethers.getAddress(this.owner())) {
        throw new Error(
          `Post can only be created by the owner: ${this.owner()}`
        );
      }

      // Get the IPFS hash of the post without uploading it to IPFS.
      const ipfsHash = await IPFS.getHash(data);

      const metadata = await crypto(data);
      const staticMetadataB58 = await IPFS.add(
        JSON.stringify({
          ...metadata,
          ipfsHash
        })
      );
      const proofhash = IPFS.hashToSha256(staticMetadataB58);

      const tx = await this.contract().submitHash(proofhash);
      const receipt = await tx.wait();

      return {
        receipt,
        post: new ErasurePost({
          proofhash,
          owner: this.owner(),
          feedAddress: this.address(),
          protocolVersion: this.#protocolVersion
        })
      };
    } catch (err) {
      throw err;
    }
  };

  /**
   * Get all the posts submitted to this feed
   *
   * @returns {Promise<ErasurePost[]>} array of ErasurePost objects
   */
  getPosts = async () => {
    let results = await Ethers.getProvider().getLogs({
      address: this.address(),
      topics: [ethers.utils.id("HashSubmitted(bytes32)")],
      fromBlock: 0
    });

    let posts = [];
    if (results && results.length > 1) {
      // First proofhash is that of feed creation.
      // so we can ignore it.
      results = results.slice(1);

      for (const result of results) {
        posts.push(
          new ErasurePost({
            owner: this.owner(),
            proofhash: result.data,
            feedAddress: this.address(),
            protocolVersion: this.#protocolVersion
          })
        );
      }
    }

    return posts;
  };
}

export default ErasureFeed;
