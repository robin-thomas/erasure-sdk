import NMR from "./contracts/NMR";
import Feed from "./contracts/Feed";
import Feed_Factory from "./contracts/Feed_Factory";
import OneWayGriefing_Factory from "./contracts/OneWayGriefing_Factory";

import Stake from "./client/Stake";
import CreateFeed from "./client/CreateFeed";
import CreatePost from "./client/CreatePost";
import RevealPost from "./client/RevealPost";

class ErasureClient {
  constructor({ network, version, infura, mnemonic }) {
    this.version = version;
    this.network = network;

    this.web3 = Web3.getWeb3(null, { infura, mnemonic });

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
    this.oneWayGriefingFactory = new OneWayGriefing_Factory(opts);
  }

  initKeystore() {
    this.keystore = {};

    // Generate a keypair.
    this.keystore.asymmetric = Crypto.asymmetric.genKeypair();
  }

  initDatastore() {
    this.datastore = {};

    this.datastore.feed = {};
    this.datastore.griefing = {};
  }

  // Create a new feed.
  async createFeed() {
    try {
      return await CreateFeed.bind(this)();
    } catch (err) {
      throw err;
    }
  }

  // Create a new post.
  async createPost(post) {
    try {
      return await CreatePost.bind(this)(post);
    } catch (err) {
      throw err;
    }
  }

  // Reveal an encrypted post
  // so that others can view it.
  async revealPost(ipfsHash) {
    try {
      return await RevealPost.bind(this)(ipfsHash);
    } catch (err) {
      throw err;
    }
  }

  // Stake your feed.
  async stake({
    stakeAmount,
    counterParty,
    countdownLength,
    ratio = 0,
    ratioType = 1
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
}

export default ErasureClient;
