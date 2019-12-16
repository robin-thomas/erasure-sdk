import { ethers } from "ethers";

import Erasure_Users from "./registry/Erasure_Users";

import Feed_Factory from "./factory/Feed_Factory";
import Escrow_Factory from "./factory/Escrow_Factory";
import Agreement_Factory from "./factory/Agreement_Factory";

import IPFS from "./utils/IPFS";
import Utils from "./utils/Utils";
import Ethers from "./utils/Ethers";

import contracts from "./contracts.json";

/**
 * @typedef {Object} Feed
 * @property {address} address - feed contract address
 * @property {address} operator - use who created this feed
 * @property {string} ipfsMultihash - base58 encoded ipfs multihash
 * @property {Object[]} posts - posts created in this feed
 * @property {string} posts.proofHash - sha256 hash of raw post
 * @property {string} posts.ipfsMultihash - base58 encoded ipfs multihash
 */

/**
 * @typedef {Object} FeedReceipt
 * @property {address} address - address of new feed
 * @property {Object} receipt - transaction receipt of new feed
 */

/**
 * @typedef {Object} FeedWithReceipt
 * @property {Feed} feed
 * @property {FeedReceipt} receipt
 */

/**
 * @typedef {Object} PostReceipt
 * @property {string} proofHash - sha256 hash of raw data
 * @property {string} ipfsMultihash - base58 encoded ipfs multihash
 * @property {Object} receipt - transaction receipt of new post
 */
class ErasureClient {
  #registry = {};
  #appName = "";
  #appVersion = "";
  #protocolVersion = "";

  #feedFactory = null;
  #erasureUsers = null;
  #escrowFactory = null;
  #agreementFactory = null;

  /**
   * ErasureClient
   *
   * @constructor
   * @param {Object} config - configuration for ErasureClient
   * @param {string} config.appName - name of your app
   * @param {string} config.appVersion - version of your app
   * @param {string} config.protocolVersion - version of the erasure protocol
   */
  constructor({ appName, appVersion, protocolVersion, registry }) {
    this.#appName = appName;
    this.#appVersion = appVersion;
    this.#protocolVersion = protocolVersion;

    this.#registry =
      process.env.NODE_ENV === "test"
        ? registry
        : contracts[this.protocolVersion];
  }

  /**
   * To initialize the client.
   * This ought to be called before calling any client functions.
   *
   * @returns {Promise} receipt of createUser
   */
  async login() {
    try {
      const opts = {
        registry: this.#registry,
        network: await Ethers.getProvider().getNetwork(),
        protocolVersion: this.#protocolVersion
      };

      this.#erasureUsers = new Erasure_Users(opts);
      this.#escrowFactory = new Escrow_Factory({
        ...opts,
        erasureUsers: this.#erasureUsers
      });
      this.#feedFactory = new Feed_Factory({
        ...opts,
        escrowFactory: this.#escrowFactory
      });
      this.#agreementFactory = new Agreement_Factory(opts);

      return await this.#erasureUsers.registerUser();
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get the Erasure object associated with a given address
   *
   * @param {string} address - address to fetch
   * @returns {Promise<(ErasureFeed|ErasurePost|ErasureEscrow|ErasureAgreement)>} Erasure object
   */
  async getObject(address) {
    try {
      // Check if address is proofhash. If yes, then its ErasurePost.
      if (Utils.isProofhash(address)) {
        const feeds = await this.#feedFactory.getFeeds();
        if (feeds && feeds.length > 0) {
          for (const feed of feeds) {
            const posts = await feed.getPosts();
            const _posts = posts.reduce((p, post) => {
              p[post.proofhash().proofhash] = post;
              return p;
            }, {});

            if (address in _posts) {
              return feed.createClone(address);
            }
          }
        }
      }

      const init = {
        feed: "Initialized(address,bytes32,bytes)",
        escrow:
          "Initialized(address,address,address,uint256,uint256,uint256,bytes,bytes)",
        simple: "Initialized(address,address,address,uint256,uint8,bytes)",
        countdown:
          "Initialized(address,address,address,uint256,uint8,uint256,bytes)"
      };

      for (const type of Object.keys(init)) {
        // Get the contract creation transaction.
        const results = await Ethers.getProvider().getLogs({
          address,
          fromBlock: 0,
          topics: [ethers.utils.id(init[type])]
        });

        // Found the type.
        if (results.length > 0) {
          switch (type) {
            case "feed":
              return this.#feedFactory.createClone(address);

            case "escrow":
              const {
                buyer,
                seller,
                stakeAmount,
                paymentAmount,
                staticMetadataB58
              } = this.#escrowFactory.decodeParams(results[0].data);

              const metadata = await IPFS.get(staticMetadataB58);

              return this.#escrowFactory.createClone({
                escrowAddress: address,
                buyer,
                seller,
                proofhash: JSON.parse(metadata).proofhash,
                stakeAmount,
                paymentAmount
              });

            case "simple":
            case "countdown":
              const {
                staker,
                counterparty
              } = this.#agreementFactory.decodeParams(results[0].data);

              return this.#agreementFactory.createClone(
                address,
                type,
                staker,
                counterparty
              );
          }
        }
      }

      // Didnt find the type.
      throw new Error(
        `Address ${address} is not feed, post, escrow or agreement type!`
      );
    } catch (err) {
      throw err;
    }
  }

  /**
   * Create a new feed
   *
   * @param {Object} config
   * @param {string} [config.operator] optional operator
   * @param {string} [config.proofhash] optional initial post
   * @param {string} [config.data] optional initial post raw data
   * @param {string} [config.metadata] optional metadata
   * @returns {Promise<Feed>}
   */
  async createFeed(opts) {
    let { operator, data, proofhash, metadata } = opts || {};

    operator = operator || (await Ethers.getAccount());
    if (!Ethers.isAddress(operator)) {
      throw new Error(`Operator ${operator} is not an address`);
    }

    metadata = metadata || "";

    if (proofhash !== undefined && !Utils.isProofhash(proofhash)) {
      throw new Error(`Invalid proofhash: ${proofhash}`);
    }

    const feed = await this.#feedFactory.create({
      operator,
      metadata
    });

    // Create optional post.
    if (proofhash !== undefined) {
      await feed.createPost(null, proofhash);
    } else if (data !== undefined && data !== null) {
      await feed.createPost(data, null);
    }

    return feed;
  }

  /**
   *
   * Create a new escrow
   *
   * @param {Object} config
   * @param {string} [config.operator]
   * @param {string} [config.buyer]
   * @param {string} [config.seller]
   * @param {string} config.paymentAmount
   * @param {string} config.stakeAmount
   * @param {string} config.escrowCountdown
   * @param {string} config.griefRatio
   * @param {string} config.griefRatioType
   * @param {string} config.agreementCountdown
   * @param {string} [config.metadata]
   * @returns {Promise<EscrowWithReceipt>}
   */
  async createEscrow({
    operator,
    buyer,
    seller,
    paymentAmount,
    stakeAmount,
    escrowCountdown,
    griefRatio,
    griefRatioType,
    agreementCountdown,
    metadata
  }) {
    operator = operator || (await Ethers.getAccount());
    if (!Ethers.isAddress(operator)) {
      throw new Error(`Operator ${operator} is not an address`);
    }

    buyer = buyer || operator;

    return await this.#escrowFactory.create({
      operator,
      buyer,
      seller,
      paymentAmount,
      stakeAmount,
      escrowCountdown,
      griefRatio,
      griefRatioType,
      agreementCountdown,
      metadata
    });
  }

  /**
   * Create a new agreement
   *
   * @param {Object} config
   * @param {string} [config.operator]
   * @param {string} [config.staker]
   * @param {string} config.counterparty
   * @param {string} config.griefRatio
   * @param {string} config.griefRatioType
   * @param {string} [config.countdownLength] - creates a simple griefing agreement if not set
   * @param {string} [config.metadata]
   * @returns {Promise<AgreementWithReceipt>}
   */
  async createAgreement({
    operator,
    staker,
    counterparty,
    griefRatio,
    griefRatioType,
    countdownLength,
    metadata
  }) {
    try {
      if (operator === undefined) {
        operator = await Ethers.getAccount();
      }
      if (!Ethers.isAddress(operator)) {
        throw new Error(`Operator ${operator} is not an address`);
      }

      if (staker === undefined) {
        staker = operator;
      }

      if (!Ethers.isAddress(counterparty)) {
        throw new Error(`Counterparty ${counterparty} is not an address`);
      }

      // // Convert the ipfs hash to multihash hex code.
      // const ipfsHash = await IPFS.add(metadata);
      // const staticMetadata = CryptoIPFS.ipfs.hashToHex(ipfsHash);

      return await this.#agreementFactory.create({
        operator,
        staker,
        counterparty,
        griefRatio,
        griefRatioType,
        countdownLength,
        metadata: metadata || ""
      });
    } catch (err) {
      throw err;
    }
  }
}

export { Ethers };
export default ErasureClient;
