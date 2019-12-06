import NMR from "./contracts/NMR";
import Feed from "./contracts/Feed";
import Feed_Factory from "./contracts/Feed_Factory";
import Erasure_Users from "./contracts/Erasure_Users";
import SimpleGriefing from "./contracts/SimpleGriefing";
import SimpleGriefing_Factory from "./contracts/SimpleGriefing_Factory";
import CountdownGriefing from "./contracts/CountdownGriefing";
import CountdownGriefing_Factory from "./contracts/CountdownGriefing_Factory";
import CountdownGriefingEscrow_Factory from "./contracts/CountdownGriefingEscrow_Factory";

import Reward from "./client/Reward";
import Punish from "./client/Punish";
import GetFeeds from "./client/GetFeeds";
import BuyPost from "./client/BuyPost";
import SellPost from "./client/SellPost";
import CreateFeed from "./client/CreateFeed";
import StakeFeed from "./client/StakeFeed";
import CreatePost from "./client/CreatePost";
import StakePost from "./client/StakePost";
import CreateUser from "./client/CreateUser";
import RevealPost from "./client/RevealPost";
import GetGriefings from "./client/GetGriefings";
import ReleaseStake from "./client/ReleaseStake";
import RetrieveStake from "./client/RetrieveStake";

import Box from "./utils/3Box";
import Crypto from "./utils/Crypto";
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
 * @typedef {Object} PostReceipt
 * @property {string} proofHash - sha256 hash of raw data
 * @property {string} ipfsMultihash - base58 encoded ipfs multihash
 * @property {Object} receipt - transaction receipt of new post
 */
class ErasureClient {
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
    this.appName = appName;
    this.appVersion = appVersion;
    this.registry = registry;
    this.protocolVersion = protocolVersion;
  }

  /**
   * To initialize the client.
   * This ought to be called before calling any client functions.
   *
   * @returns {Promise} receipt
   */
  async login() {
    try {
      const opts = {
        network: await Ethers.getNetworkName(),
        registry:
          process.env.NODE_ENV === "test"
            ? this.registry
            : contracts[protocolVersion]
      };

      // Create contract objects.
      this.nmr = new NMR(opts);
      this.feed = new Feed(opts);
      this.feedFactory = new Feed_Factory(opts);
      this.erasureUsers = new Erasure_Users(opts);
      this.simpleGriefing = new SimpleGriefing(opts);
      this.simpleGriefingFactory = new SimpleGriefing_Factory(opts);
      this.countdownGriefing = new CountdownGriefing(opts);
      this.countdownGriefingFactory = new CountdownGriefing_Factory(opts);
      this.countdownGriefingEscrowFactory = new CountdownGriefingEscrow_Factory(
        opts
      );

      // Create a new user if not created and add it to Erasure_Users.
      return await CreateUser.bind(this)();
    } catch (err) {
      throw err;
    }
  }

  /**
   * Create a new Feed
   *
   * @returns {Promise<FeedReceipt>}
   */
  async createFeed() {
    try {
      return await CreateFeed.bind(this)();
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get all feeds of a user.
   * if no user is supplied, feeds of current user will be returned.
   *
   * @param {address} [user] - get all feeds of this user
   * @returns {Promise<Feed[]>} get all feeds of this user
   */
  async getFeeds(user = null) {
    try {
      return await GetFeeds.bind(this)(user);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Create a new Post
   *
   * @param {string} post - raw data to be posted
   * @param {address} feedAddress - feed to where this post should be added
   * @returns {Promise<PostReceipt>}
   */
  async createPost(post, feedAddress) {
    try {
      if (!Ethers.isAddress(feedAddress)) {
        throw new Error(`Not a valid feed address: ${feedAddress}`);
      }

      return await CreatePost.bind(this)(post, feedAddress);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Reveal an encrypted post so that others can view it
   *
   * @param {string} proofHash - sha256 hash of raw data
   * @returns {Promise<string>} sha256 hash of raw data
   */
  async revealPost(proofHash) {
    try {
      return await RevealPost.bind(this)(proofHash);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Create a new agreement and deposit stake
   *
   * @param {Object} config - configuration for staking
   * @param {address} config.feedAddress
   * @param {string} config.stakeAmount - amount to be staked
   * @param {address} config.counterParty - party with whom the agreement to be made
   * @param {string} config.griefingType - accepts "countdown" or "simple"
   * @param {number} config.countdownLength - duration of the agreement in seconds
   * @param {string} [config.ratio] - griefing ratio
   * @param {number} [config.ratioType] - griefing ratio type
   * @returns {Promise} transaction receipts of griefing, approval and staking
   */
  async stakeFeed({
    feedAddress,
    stakeAmount,
    counterParty,
    countdownLength,
    griefingType,
    ratio,
    ratioType
  }) {
    try {
      return await StakeFeed.bind(this)({
        feedAddress,
        stakeAmount,
        counterParty,
        countdownLength,
        griefingType: griefingType || "countdown",
        ratio: ratio || "1",
        ratioType: ratioType || 2
      });
    } catch (err) {
      throw err;
    }
  }

  /**
   * Create a new agreement and deposit stake
   *
   * @param {Object} config - configuration for staking
   * @param {address} config.proofHash
   * @param {string} config.stakeAmount - amount to be staked
   * @param {address} config.counterParty - party with whom the agreement to be made
   * @param {string} config.griefingType - accepts "countdown" or "simple"
   * @param {number} config.countdownLength - duration of the agreement in seconds
   * @param {string} [config.ratio] - griefing ratio
   * @param {number} [config.ratioType] - griefing ratio type
   * @returns {Promise} transaction receipts of griefing, approval and staking
   */
  async stakePost({
    proofHash,
    stakeAmount,
    counterParty,
    countdownLength,
    griefingType,
    ratio,
    ratioType
  }) {
    try {
      return await StakePost.bind(this)({
        proofHash,
        stakeAmount,
        counterParty,
        countdownLength,
        griefingType: griefingType || "countdown",
        ratio: ratio || "1",
        ratioType: ratioType || 2
      });
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get all griefings of current user
   *
   * @returns {Promise} get all griefings of current user
   */
  async getGriefings() {
    try {
      return await GetGriefings.bind(this)();
    } catch (err) {
      throw err;
    }
  }

  /**
   * Reward a user
   *
   * @param {Object} config - configuration for reward
   * @param {string} config.rewardAmount - amount to be rewarded
   * @param {address} config.griefingAddress - contract address of the griefing agreement
   * @returns {Promise} transaction receipt of the reward
   */
  async reward({ rewardAmount, griefingAddress }) {
    try {
      return await Reward.bind(this)({
        rewardAmount,
        griefingAddress
      });
    } catch (err) {
      throw err;
    }
  }

  /**
   * Punish a user
   *
   * @param {Object} config - configuration for punishment
   * @param {string} config.punishAmount - amount to be punished
   * @param {address} config.griefingAddress - contract address of the griefing agreement
   * @param {string} config.message - punishment message
   * @returns {Promise} transaction receipt of the punishment
   */
  async punish({ punishAmount, griefingAddress, message }) {
    try {
      return await Punish.bind(this)({
        punishAmount,
        griefingAddress,
        message
      });
    } catch (err) {
      throw err;
    }
  }

  /**
   * Release some stake to the staker
   *
   * @param {Object} config - configuration for releaseStake
   * @param {string} config.amountToRelease - amount to be released
   * @param {address} config.griefingAddress - contract address of the griefing agreement
   * @returns {Promise} transaction receipt of releaseStake
   */
  async releaseStake({ amountToRelease, griefingAddress }) {
    try {
      return await ReleaseStake.bind(this)({
        amountToRelease,
        griefingAddress
      });
    } catch (err) {
      throw err;
    }
  }

  /**
   * Retrieve the stake
   *
   * @param {Object} config - configuration for retrieveStake
   * @param {address} config.recipient - recipient to receive the stake
   * @param {address} config.griefingAddress - contract address of the griefing agreement
   * @returns {Promise} transaction receipt of retrieveStake
   */
  async retrieveStake({ recipient, griefingAddress }) {
    try {
      return await RetrieveStake.bind(this)({
        recipient,
        griefingAddress
      });
    } catch (err) {
      throw err;
    }
  }

  /**
   * Sell a post
   *
   * @param {address} griefingAddress - contract address of the griefing agreement
   * @returns {Promise}
   */
  async sellPost(griefingAddress) {
    try {
      return await SellPost.bind(this)(griefingAddress);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Buy a post
   *
   * @param {address} griefingAddress - contract address of the griefing agreement
   * @returns {Promise} post that is bought
   */
  async buyPost(griefingAddress) {
    try {
      return await BuyPost.bind(this)(griefingAddress);
    } catch (err) {
      throw err;
    }
  }

  setGriefing(griefingType, griefingAddress) {
    switch (griefingType) {
      case "countdown-escrow":
        this.griefing = this.countdownGriefing;
        this.griefingFactory = this.countdownGriefingEscrowFactory;
        break;

      case "countdown":
        this.griefing = this.countdownGriefing;
        this.griefingFactory = this.countdownGriefingFactory;
        break;

      case "simple":
        this.griefing = this.simpleGriefing;
        this.griefingFactory = this.simpleGriefingFactory;
        break;
    }

    if (Ethers.isAddress(griefingAddress)) {
      this.griefing.setAddress(griefingAddress);
    } else if (griefingAddress !== null) {
      throw new Error(`Invalid griefing address: ${griefingAddress}`);
    }
  }
}

export { Ethers };
export default ErasureClient;
