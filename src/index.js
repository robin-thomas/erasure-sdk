import { ethers } from "ethers";
import { constants } from "@erasure/crypto-ipfs";

import DAI from "./token/DAI";
import NMR from "./token/NMR";
import Token from "./erasure/Token";

import Erasure_Users from "./registry/Erasure_Users";

import Feed_Factory from "./factory/Feed_Factory";
import Escrow_Factory from "./factory/Escrow_Factory";
import Agreement_Factory from "./factory/Agreement_Factory";

import IPFS from "./utils/IPFS";
import Utils from "./utils/Utils";
import Ethers from "./utils/Ethers";
import Config from "./utils/Config";
import ESP_1001 from "./utils/ESP_1001";

class ErasureClient {
  #ipfs = null;
  #authereum = {};
  #registry = {};
  #web3Provider = null;
  #ethersProvider = null;
  #protocolVersion = "";

  #token = null;
  #feedFactory = null;
  #erasureUsers = null;
  #escrowFactory = null;
  #agreementFactory = null;

  /**
   * ErasureClient
   *
   * @constructor
   * @param {Object} config - configuration for ErasureClient
   * @param {string} config.web3Provider
   * @param {string} config.protocolVersion - version of the erasure protocol
   * @param {Object} [config.ipfs] - ipfs config
   * @param {string} config.ipfs.host
   * @param {string} config.ipfs.port
   * @param {string} config.ipfs.protocol
   */
  constructor({ protocolVersion, web3Provider, registry, ipfs, authereum }) {
    this.#ipfs = null;
    this.#authereum = authereum;
    this.#registry = null;
    this.#web3Provider = null;
    this.#ethersProvider = null;
    this.#protocolVersion = protocolVersion;

    if (ipfs !== undefined && ipfs !== null) {
      this.#ipfs = ipfs;
    } else {
      this.#ipfs = require("./config.json").ipfs;
    }

    if (web3Provider !== undefined && web3Provider !== null) {
      this.#web3Provider = web3Provider;
      this.#ethersProvider = new ethers.providers.Web3Provider(
        web3Provider.currentProvider,
      );
    } else {
      throw new Error("Need to provide a web3Provider!");
    }

    if (process.env.NODE_ENV === "test") {
      this.#registry = registry;
    }
  }

  /**
   * To initialize the client.
   * This ought to be called before calling any client functions.
   *
   * @returns {Promise} receipt of registerUser
   */
  async login() {
    try {
      Config.store = {
        ipfs: this.#ipfs,
        authereum: this.#authereum,
        registry: this.#registry,
        network: (await this.#ethersProvider.getNetwork()).name,
        web3Provider: this.#web3Provider,
        ethersProvider: this.#ethersProvider,
        protocolVersion: this.#protocolVersion,
      };

      if (process.env.NODE_ENV !== "test") {
        const contracts = require(`@erasure/abis/src/${this.#protocolVersion}`);

        Config.store.registry = Object.keys(contracts).reduce((p, c) => {
          p[c] = contracts[c][Config.store.network];
          return p;
        }, {});
      }

      this.#token = new Token({
        dai: new DAI(),
        nmr: new NMR(),
      });
      this.#erasureUsers = new Erasure_Users();
      this.#escrowFactory = new Escrow_Factory({
        token: this.#token,
        erasureUsers: this.#erasureUsers,
      });
      this.#feedFactory = new Feed_Factory({
        escrowFactory: this.#escrowFactory,
        tokenManager: this.#token,
      });
      this.#agreementFactory = new Agreement_Factory({
        token: this.#token,
      });

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
    // TODO:
    // Need to set creationReceipt.
    try {
      // Check if address is proofhash. If yes, then its ErasurePost.
      if (Utils.isProofhash(address) || (await IPFS.isHash(address))) {
        if (await IPFS.isHash(address)) {
          address = Utils.hashToSha256(address);
        }

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

        throw new Error("Unable to construct ErasurePost object!");
      }

      if (!Ethers.isAddress(address)) {
        throw new Error(`Not a valid address: ${address}`);
      }

      const init = {
        feed: "Initialized(address,bytes)",
        escrow:
          "Initialized(address,address,address,uint8,uint256,uint256,uint256,bytes,bytes)",
        simple:
          "Initialized(address,address,address,uint8,uint256,uint8,bytes)",
        countdown:
          "Initialized(address,address,address,uint8,uint256,uint8,uint256,bytes)",
      };

      for (const type of Object.keys(init)) {
        // Get the contract creation transaction.
        const results = await this.#ethersProvider.getLogs({
          address,
          fromBlock: 0,
          topics: [ethers.utils.id(init[type])],
        });

        // Found the type.
        if (results.length > 0) {
          const creationReceipt = await Config.store.ethersProvider.getTransactionReceipt(
            results[0].transactionHash,
          );

          console.log("type", type);

          switch (type) {
            case "feed":
              return this.#feedFactory.createClone(address, creationReceipt);

            case "escrow": {
              let {
                buyer,
                seller,
                tokenID,
                stakeAmount,
                paymentAmount,
                encodedMetadata,
              } = this.#escrowFactory.decodeParams(
                results[0].data,
                false /* encodedCalldata */,
              );

              return this.#escrowFactory.createClone({
                buyer,
                seller,
                tokenID,
                stakeAmount,
                paymentAmount,
                escrowAddress: address,
                creationReceipt,
                encodedMetadata,
              });
            }

            case "simple": {
              let {
                tokenID,
                staker,
                griefRatio,
                counterparty,
                encodedMetadata,
              } = this.#agreementFactory.decodeParams(results[0].data, false);

              return this.#agreementFactory.createClone({
                address,
                type,
                tokenID,
                staker,
                griefRatio,
                counterparty,
                creationReceipt,
                encodedMetadata,
              });
            }

            case "countdown": {
              let {
                tokenID,
                staker,
                griefRatio,
                counterparty,
                encodedMetadata,
              } = this.#agreementFactory.decodeParams(results[0].data);

              return this.#agreementFactory.createClone({
                address,
                type,
                tokenID,
                staker,
                griefRatio,
                counterparty,
                creationReceipt,
                encodedMetadata,
              });
            }
          }
        }
      }

      // Didnt find the type.
      throw new Error(
        `Address ${address} is not feed, post, escrow or agreement type!`,
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
   * @returns {Promise<ErasureFeed>}
   */
  async createFeed(opts) {
    let { operator, data, proofhash, metadata } = opts || {};

    operator = operator || ethers.constants.AddressZero;
    if (!Ethers.isAddress(operator)) {
      throw new Error(`Operator ${operator} is not an address`);
    }

    metadata = metadata || undefined;

    if (proofhash !== undefined && !Utils.isProofhash(proofhash)) {
      throw new Error(`Invalid proofhash: ${proofhash}`);
    }

    const feed = await this.#feedFactory.create({
      operator,
      metadata,
    });

    // Create optional post.
    if (proofhash !== undefined && proofhash !== null) {
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
   * @returns {Promise<ErasureEscrow>}
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
    tokenID = constants.TOKEN_TYPES.NMR,
    metadata,
  }) {
    operator = operator || ethers.constants.AddressZero;
    buyer = buyer || ethers.constants.AddressZero;
    seller = seller || ethers.constants.AddressZero;

    if (!Ethers.isAddress(operator)) {
      throw new Error(`Operator ${operator} is not an address`);
    }
    if (!Ethers.isAddress(buyer)) {
      throw new Error(`Buyer ${buyer} is not an address`);
    }
    if (!Ethers.isAddress(seller)) {
      throw new Error(`Seller ${seller} is not an address`);
    }

    metadata = metadata || undefined;

    return this.#escrowFactory.create({
      operator,
      buyer,
      seller,
      paymentAmount,
      stakeAmount,
      escrowCountdown,
      griefRatio,
      griefRatioType,
      agreementCountdown,
      tokenID,
      metadata,
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
   * @returns {Promise<ErasureAgreement>}
   */
  async createAgreement({
    operator,
    staker,
    counterparty,
    griefRatio,
    griefRatioType,
    countdownLength,
    tokenID = constants.TOKEN_TYPES.NMR,
    metadata,
  }) {
    try {
      operator = operator || ethers.constants.AddressZero;

      if (!Ethers.isAddress(operator)) {
        throw new Error(`Operator ${operator} is not an address`);
      }
      if (!Ethers.isAddress(staker)) {
        throw new Error(`staker ${staker} is not an address`);
      }
      if (!Ethers.isAddress(counterparty)) {
        throw new Error(`counterparty ${counterparty} is not an address`);
      }

      metadata = metadata || undefined;

      return this.#agreementFactory.create({
        operator,
        staker,
        counterparty,
        griefRatio,
        griefRatioType,
        countdownLength,
        tokenID,
        metadata,
      });
    } catch (err) {
      throw err;
    }
  }

  /**
   * Mint mock NMR/DAI tokens for testnet.
   *
   * @param {string} paymentAmount
   * @param {integer} tokenID
   */
  async mintMockTokens(
    paymentAmount,
    tokenID = constants.TOKEN_TYPES.NMR,
    user = null,
  ) {
    if (!this.#token) {
      throw new Error("You need to call login() first");
    }

    try {
      if (!user) {
        user = await Ethers.getAccount(this.#ethersProvider);
      } else if (!Ethers.isAddress(user)) {
        throw new Error(`Not a valid address: ${user}`);
      }

      paymentAmount = Ethers.parseEther(paymentAmount);
      await this.#token.mintMockTokens(tokenID, user, paymentAmount);
    } catch (err) {
      throw err;
    }
  }
}

export { Ethers };
export default ErasureClient;
