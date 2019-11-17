import NMR from "./contracts/NMR";
import Feed from "./contracts/Feed";
import Feed_Factory from "./contracts/Feed_Factory";
import CountdownGriefing from "./contracts/CountdownGriefing";
import CountdownGriefing_Factory from "./contracts/CountdownGriefing_Factory";

import Stake from "./client/Stake";
import Reward from "./client/Reward";
import CreateFeed from "./client/CreateFeed";
import CreatePost from "./client/CreatePost";
import RevealPost from "./client/RevealPost";

import Crypto from "./utils/Crypto";

class ErasureClient {
  /**
   * ErasureClient
   *
   * @constructor
   * @param {Object} config - configuration for ErasureClient
   * @param {string} config.network - eth network string (like ropsten, rinkeby)
   * @param {string} config.version - version string for your ErasureClient
   */
  constructor({ network, version }) {
    this.version = version;
    this.network = network;

    // Keystore
    // store the symmetric keys, keypair and so on.
    this.initKeystore();

    // Datastore
    // stores the details about IPFS hashes.
    this.initDatastore();

    // Create contract objects.
    const opts = { network, web3: this.web3 };
    this.nmr = new NMR(opts);
    this.feed = new Feed(opts);
    this.feedFactory = new Feed_Factory(opts);
    this.countdownGriefing = new CountdownGriefing(opts);
    this.countdownGriefingFactory = new CountdownGriefing_Factory(opts);
  }

  initKeystore() {
    this.keystore = {};

    // keypair will be generated for the first post.
    this.keystore.asymmetric = null;
  }

  initDatastore() {
    this.datastore = {};

    this.datastore.feed = {};
    this.datastore.griefing = {};
    this.datastore.post = {
      posts: []
    };
  }

  /**
   * Create a new Feed
   *
   * @returns {Promise} transaction receipt of new feed
   */
  async createFeed() {
    try {
      return await CreateFeed.bind(this)();
    } catch (err) {
      throw err;
    }
  }

  /**
   * Create a new Post
   *
   * @param {string} post - data to be posted
   * @returns {Promise} transaction receipt of new post
   */
  async createPost(post) {
    try {
      if (this.keystore.asymmetric === null) {
        this.keystore.asymmetric = await Crypto.asymmetric.genKeyPair();
      }

      return await CreatePost.bind(this)(post);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Reveal an encrypted post so that others can view it
   *
   * @param {string} ipfsHash - ipfs hash of where the unencrypted post will be
   * @returns {Promise} ipfs hash of the unencrypted post
   */
  async revealPost(ipfsHash) {
    try {
      return await RevealPost.bind(this)(ipfsHash);
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
   * Reward a user
   *
   * @param {Object} config - configuration for reward
   * @param {string} config.amountToAdd - amount to be rewarded
   * @param {string} config.griefingAddress - contract address of the griefing agreement
   * @returns {Promise} transaction receipt of staking
   */
  async reward({ amountToAdd, griefingAddress }) {
    try {
      return await Reward.bind(this)({
        amountToAdd,
        griefingAddress
      });
    } catch (err) {
      throw err;
    }
  }
}

export default ErasureClient;
