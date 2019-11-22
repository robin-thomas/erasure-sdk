import NMR from "./contracts/NMR";
import Feed from "./contracts/Feed";
import Feed_Factory from "./contracts/Feed_Factory";
import CountdownGriefing from "./contracts/CountdownGriefing";
import CountdownGriefing_Factory from "./contracts/CountdownGriefing_Factory";

import Stake from "./client/Stake";
import Reward from "./client/Reward";
import Punish from "./client/Punish";
import GetFeeds from "./client/GetFeeds";
import GetPosts from "./client/GetPosts";
import CreateFeed from "./client/CreateFeed";
import CreatePost from "./client/CreatePost";
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
   * @param {string} config.version - version string for your ErasureClient
   * @param {string} [config.registry] - for running tests
   */
  constructor({ version, registry }) {
    this.version = version;

    // Create contract objects.
    let opts = {};
    if (process.env.NODE_ENV === "test") {
      opts.registry = registry;
    }

    this.nmr = new NMR(opts);
    this.feed = new Feed(opts);
    this.feedFactory = new Feed_Factory(opts);
    this.countdownGriefing = new CountdownGriefing(opts);
    this.countdownGriefingFactory = new CountdownGriefing_Factory(opts);
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
      await this.countdownGriefing.login();
      await this.countdownGriefingFactory.login();
      return true;
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
   * Get all feeds of this user
   *
   * @returns {Promise} get all feeds of this user
   */
  async getFeeds() {
    try {
      return await GetFeeds.bind(this)();
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
   * Get all posts of this user given a feed
   *
   * @param {string} feedAddress
   * @returns {Promise} get all posts of this user
   */
  async getPosts(feedAddress) {
    try {
      return await GetPosts.bind(this)(feedAddress);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Reveal an encrypted post so that others can view it
   *
   * @param {string} feedAddress
   * @param {string} ipfsHash - ipfs hash of where the unencrypted post will be
   * @returns {Promise} ipfs hash of the unencrypted post (after uploading)
   */
  async revealPost(feedAddress, ipfsHash) {
    try {
      return await RevealPost.bind(this)(feedAddress, ipfsHash);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Stake your feed
   *
   * @param {Object} config - configuration for staking
   * @param {string} config.stakeAmount - amount to be staked
   * @param {string} config.counterParty - party with whom the agreement to be made
   * @param {number} config.countdownLength - duration of the agreement in seconds
   * @param {string} [config.ratio] - griefing ratio
   * @param {number} [config.ratioType] - griefing ratio type
   * @returns {Promise} transaction receipts of griefing, approval and staking
   */
  async stake({
    stakeAmount,
    counterParty,
    countdownLength,
    ratio = "1",
    ratioType = 2
  }) {
    try {
      return await Stake.bind(this)({
        stakeAmount,
        counterParty,
        countdownLength,
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
   * @param {string} feedAddress
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
}

export { Ethers };
export default ErasureClient;
