import NMR from "./contracts/NMR";
import Feed from "./contracts/Feed";
import Feed_Factory from "./contracts/Feed_Factory";
import OneWayGriefing from "./contracts/OneWayGriefing";
import OneWayGriefing_Factory from "./contracts/OneWayGriefing_Factory";

import Stake from "./client/Stake";
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
   * @param {Object} [config.web3] - web3 object
   * @param {string} config.network - eth network string (like ropsten, rinkeby)
   * @param {string} config.version - version string for your ErasureClient
   * @param {string} [config.infura] - infura network api endpoint
   * @param {string} [config.mnemonic] - metamask mnemonic string of the wallet
   */
  constructor({ web3, network, version, infura, mnemonic }) {
    this.version = version;
    this.network = network;

    if (web3 == undefined) {
      this.web3 = Web3.getWeb3(null, { infura, mnemonic });
    } else {
      this.web3 = web3;
    }

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
    this.oneWayGriefing = new OneWayGriefing(opts);
    this.oneWayGriefingFactory = new OneWayGriefing_Factory(opts);
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
        this.keystore.asymmetric = await Crypto.asymmetric.genKeyPair(
          this.web3
        );
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
   * @param {number} [config.ratio] - griefing ratio
   * @param {number} [config.ratioType] - griefing ratio type
   * @param {string} [config.contractAddress] - for mocha test (to get Mock NMR tokens)
   * @returns {Promise} transaction receipts of griefing, approval and staking
   */
  async stake({
    stakeAmount,
    counterParty,
    countdownLength,
    ratio = 0,
    ratioType = 1,
    contractAddress
  }) {
    try {
      return await Stake.bind(this)({
        stakeAmount,
        counterParty,
        countdownLength,
        ratio,
        ratioType,
        contractAddress
      });
    } catch (err) {
      throw err;
    }
  }
}

export default ErasureClient;
