import { ethers } from "ethers";

import ErasurePost from "./ErasurePost";
import Escrow_Factory from "../factory/Escrow_Factory";

import Box from "../utils/3Box";
import IPFS from "../utils/IPFS";
import Utils from "../utils/Utils";
import Crypto from "../utils/Crypto";
import Ethers from "../utils/Ethers";

import { abi } from "@erasure/abis/src/v1.3.0/abis/Feed.json";

class ErasureFeed {
  #owner = null;
  #numSold = 0;
  #contract = null;
  #feedAddress = null;
  #escrowFactory = null;
  #web3Provider = null;
  #ethersProvider = null;
  #protocolVersion = "";
  #creationReceipt = null;

  /**
   * @constructor
   * @param {Object} config
   * @param {string} config.owner
   * @param {string} config.feedAddress
   * @param {Object} config.web3Provider
   * @param {string} config.protocolVersion
   * @param {Object} config.creationReceipt
   */
  constructor({
    owner,
    feedAddress,
    web3Provider,
    ethersProvider,
    protocolVersion,
    escrowFactory,
    creationReceipt
  }) {
    this.#owner = owner;
    this.#feedAddress = feedAddress;
    this.#escrowFactory = escrowFactory;
    this.#web3Provider = web3Provider;
    this.#ethersProvider = ethersProvider;
    this.#protocolVersion = protocolVersion;
    this.#creationReceipt = creationReceipt;

    this.#contract = new ethers.Contract(
      feedAddress,
      abi,
      Ethers.getWallet(this.#ethersProvider)
    );
  }

  /**
   * Access the web3 contract class
   *
   * @memberof ErasureFeed
   * @method contract
   */
  contract = () => {
    return this.#contract;
  };

  /**
   * Get the address of this feed
   *
   * @memberof ErasureFeed
   * @method address
   * @returns {address} address of the feed
   */
  address = () => {
    return this.#feedAddress;
  };

  /**
   * Get the creationReceipt of this feed
   *
   * @memberof ErasureFeed
   * @method creationReceipt
   * @returns {Object}
   */
  creationReceipt = () => {
    return this.#creationReceipt;
  };

  /**
   * Get the address of the owner of this feed
   *
   * @memberof ErasureFeed
   * @method owner
   * @returns {address} address of the owner
   */
  owner = () => {
    return this.#owner;
  };

  /**
   * Submit new data to this feed
   * - can only called by feed owner
   *
   * @memberof ErasureFeed
   * @method createPost
   * @param {string} data - raw data to be posted
   * @param {string} [proofhash]
   * @returns {Promise<ErasurePost>}
   * {@link https://github.com/erasureprotocol/erasure-protocol#track-record-through-posts-and-feeds}
   */
  createPost = async (data, proofhash = null) => {
    try {
      const operator = await Ethers.getAccount(this.#ethersProvider);
      if (Ethers.getAddress(operator) !== Ethers.getAddress(this.owner())) {
        throw new Error(
          `createPost() can only be called by the owner: ${this.owner()}`
        );
      }

      if (proofhash === null) {
        // Get the IPFS hash of the post without uploading it to IPFS.
        const datahash = await IPFS.getHash(data);

        const symKey = Crypto.symmetric.genKey();
        const keyhash = await IPFS.getHash(symKey);

        // Store the symKey in the keystore.
        await Box.setSymKey(keyhash, symKey, this.#web3Provider);

        const encryptedPost = Crypto.symmetric.encrypt(symKey, data);
        const encryptedDatahash = await IPFS.add(encryptedPost);

        const staticMetadataB58 = await IPFS.add(
          JSON.stringify({
            creator: operator,
            datahash,
            keyhash,
            encryptedDatahash
          })
        );
        proofhash = Utils.hashToSha256(staticMetadataB58);
      }

      const tx = await this.contract().submitHash(proofhash);
      const creationReceipt = await tx.wait();

      return new ErasurePost({
        proofhash,
        owner: this.owner(),
        feedAddress: this.address(),
        escrowFactory: this.#escrowFactory,
        web3Provider: this.#web3Provider,
        ethersProvider: this.#ethersProvider,
        protocolVersion: this.#protocolVersion,
        creationReceipt: creationReceipt
      });
    } catch (err) {
      throw err;
    }
  };

  createClone = async proofhash => {
    return new ErasurePost({
      proofhash,
      owner: this.owner(),
      feedAddress: this.address(),
      escrowFactory: this.#escrowFactory,
      web3Provider: this.#web3Provider,
      ethersProvider: this.#ethersProvider,
      protocolVersion: this.#protocolVersion
    });
  };

  /**
   * Get all the posts submitted to this feed
   *
   * @memberof ErasureFeed
   * @method getPosts
   * @returns {Promise<ErasurePost[]>} array of ErasurePost objects
   */
  getPosts = async () => {
    let results = await this.#ethersProvider.getLogs({
      address: this.address(),
      topics: [ethers.utils.id("HashSubmitted(bytes32)")],
      fromBlock: 0
    });

    let posts = [];
    if (results && results.length > 0) {
      for (const result of results) {
        posts.push(
          new ErasurePost({
            owner: this.owner(),
            proofhash: result.data,
            feedAddress: this.address(),
            web3Provider: this.#web3Provider,
            ethersProvider: this.#ethersProvider,
            escrowFactory: this.#escrowFactory,
            protocolVersion: this.#protocolVersion
          })
        );
      }
    }

    return posts;
  };

  /**
   * Reveal all posts in this feed publically
   * - fetch symkey and upload to ipfs
   *
   * @memberof ErasureFeed
   * @method reveal
   * @returns {Promise} array of base58 multihash format of the ipfs address of the revealed keys
   */
  reveal = async () => {
    const posts = await this.getPosts();

    let hashes = [];
    for (const post of posts) {
      hashes.push(await post.reveal());
    }

    return hashes;
  };

  /**
   * Get the status of the feed
   *
   * @memberof ErasureFeed
   * @method checkStatus
   * @returns {Promise} revealed bool true if the feed is revealed
   */
  checkStatus = async () => {
    let revealed = false;

    const posts = await this.getPosts();
    for (const post of posts) {
      if (await post.isRevealed()) {
        revealed = true;
        break;
      }
    }

    return { revealed };
  };
}

export default ErasureFeed;
