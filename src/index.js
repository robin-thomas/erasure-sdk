import NMR from "./contracts/NMR";
import Feed from "./contracts/Feed";
import Feed_Factory from "./contracts/Feed_Factory";
import Erasure_Users from "./contracts/Erasure_Users";
import SimpleGriefing from "./contracts/SimpleGriefing";
import SimpleGriefing_Factory from "./contracts/SimpleGriefing_Factory";
import CountdownGriefing from "./contracts/CountdownGriefing";
import CountdownGriefing_Factory from "./contracts/CountdownGriefing_Factory";

import Stake from "./client/Stake";
import Reward from "./client/Reward";
import Punish from "./client/Punish";
import GetFeeds from "./client/GetFeeds";
import BuyPost from "./client/BuyPost";
import SellPost from "./client/SellPost";
import CreateFeed from "./client/CreateFeed";
import CreatePost from "./client/CreatePost";
import CreateUser from "./client/CreateUser";
import RevealPost from "./client/RevealPost";
import GetGriefings from "./client/GetGriefings";
import ReleaseStake from "./client/ReleaseStake";
import RetrieveStake from "./client/RetrieveStake";

import Box from "./utils/3Box";
import Crypto from "./utils/Crypto";
import Ethers from "./utils/Ethers";

class ErasureClient {
  /**
   * ErasureClient
   *
   * @constructor
   * @param {Object} config - configuration for ErasureClient
   * @param {string} config.appVersion - version string for your ErasureClient
   * @param {Object} config.appName
   * @param {string} [config.registry] - for running tests
   */
  constructor({ appVersion, appName, registry }) {
    this.appName = appName;
    this.appVersion = appVersion;

    // Create contract objects.
    let opts = {};
    if (process.env.NODE_ENV === "test") {
      opts.registry = registry;
    }

    this.nmr = new NMR(opts);
    this.feed = new Feed(opts);
    this.feedFactory = new Feed_Factory(opts);
    this.erasureUsers = new Erasure_Users(opts);
    this.simpleGriefing = new SimpleGriefing(opts);
    this.simpleGriefingFactory = new SimpleGriefing_Factory(opts);
    this.countdownGriefing = new CountdownGriefing(opts);
    this.countdownGriefingFactory = new CountdownGriefing_Factory(opts);

    this.griefing = this.countdownGriefing;
    this.griefingFactory = this.countdownGriefingFactory;
  }

  /**
   * To initialize the client.
   *
   */
  async login() {
    try {
      await this.nmr.login();
      await this.feed.login();
      await this.feedFactory.login();
      await this.erasureUsers.login();
      await this.simpleGriefing.login();
      await this.simpleGriefingFactory.login();
      await this.countdownGriefing.login();
      await this.countdownGriefingFactory.login();

      // Create a new user if not created and add it to Erasure_Users.
      return await CreateUser.bind(this)();
    } catch (err) {
      throw err;
    }
  }

  // Only for test purposes.
  // So not adding it to sdk docs.
  async createUser() {
    try {
      if (process.env.NODE_ENV === "test") {
        return await CreateUser.bind(this)();
      }
    } catch (err) {
      throw err;
    }
  }

  /**
   * Create a new Feed
   *
   * @returns {Promise} transaction receipt of the new feed
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
   * @param {string} [user] - get all feeds of this user
   * @returns {Promise} get all feeds of this user
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
   * @param {string} post - data to be posted
   * @param {string} feedAddress - feed to where the post to be added
   * @returns {Promise} transaction receipt of new post
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
   * @param {string} feedAddress
   * @param {string} proofHash
   * @returns {Promise} ipfs hash of the unencrypted post (after uploading)
   */
  async revealPost(feedAddress, proofHash) {
    try {
      return await RevealPost.bind(this)(feedAddress, proofHash);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Stake your feed
   *
   * @param {Object} config - configuration for staking
   * @param {string} config.feedAddress
   * @param {string} config.proofHash
   * @param {string} config.stakeAmount - amount to be staked
   * @param {string} config.counterParty - party with whom the agreement to be made
   * @param {number} config.countdownLength - duration of the agreement in seconds
   * @param {string} [config.griefingType] - accepts "countdown" or "simple" (with "countdown" as default)
   * @param {string} [config.ratio] - griefing ratio
   * @param {number} [config.ratioType] - griefing ratio type
   * @returns {Promise} transaction receipts of griefing, approval and staking
   */
  async stake({
    feedAddress,
    proofHash,
    stakeAmount,
    counterParty,
    countdownLength,
    griefingType = "countdown",
    ratio = "1",
    ratioType = 2
  }) {
    try {
      return await Stake.bind(this)({
        feedAddress,
        proofHash,
        stakeAmount,
        counterParty,
        countdownLength,
        griefingType,
        ratio,
        ratioType
      });
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get all griefings of this user
   *
   * @returns {Promise} get all griefings of this user
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
   * @param {string} config.griefingAddress - contract address of the griefing agreement
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
   * @param {string} config.griefingAddress - contract address of the griefing agreement
   * @param {string} config.message - message
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
   * @param {string} config.griefingAddress - contract address of the griefing agreement
   * @returns {Promise} transaction receipt of staking
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
   * @param {string} config.recipient - recipient to receive the stake
   * @param {string} config.griefingAddress - contract address of the griefing agreement
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
   * @param {string} griefingAddress - contract address of the griefing agreement
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
   * @param {string} griefingAddress - contract address of the griefing agreement
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
    if (griefingType === "countdown") {
      this.griefing = this.countdownGriefing;
      this.griefingFactory = this.countdownGriefingFactory;
    } else {
      this.griefing = this.simpleGriefing;
      this.griefingFactory = this.simpleGriefingFactory;
    }

    this.griefing.setAddress(griefingAddress);
  }
}

export { Ethers };
export default ErasureClient;
