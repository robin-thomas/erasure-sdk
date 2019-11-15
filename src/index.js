import Feed from "./contracts/Feed";
import Feed_Factory from "./contracts/Feed_Factory";
import NMR from "./contracts/NMR";
import OneWayGriefing_Factory from "./contracts/OneWayGriefing_Factory";

import Web3 from "./utils/Web3";

class ErasureClient {
  constructor({ network, version, infura, mnemonic = null }) {
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

    // Symmetric keys will be generated for each ipfs hash to be encrypted.
    this.keystore.symmetric = {};
  }

  initDatastore() {
    this.datastore = {};

    this.datastore.feed = {
      address: null,
      ipfsHash: null,
      txHash: null
    };
  }

  // Create a new feed.
  async createFeed() {
    try {
      let data = null;
      const hash = this.datastore.feed.ipfsHash;
      if (hash === null) {
        data = JSON.stringify(
          {
            ErasureFeed: this.version
          },
          null,
          4
        );
      }

      this.datastore.feed = await this.feedFactory.createExplicit({
        hash,
        data
      });

      // Feed contract has been created.
      // Update the contract object.
      this.feed.setAddress(this.datastore.feed.address);

      return this.datastore.feed;
    } catch (err) {
      throw err;
    }
  }

  // Create a new post.
  async createPost(data) {
    try {
      const hash = await IPFS.add(data);

      const symmetricKey = Crypto.symmetric.genKey();
      const encryptedData = Crypto.symmetric.encrypt(symmetricKey, data);
      const encryptedDataHash = await IPFS.add(encryptedData);

      const nonce = Crypto.asymmetric.genNonce();
      const encryptedSymmetricKey = Crypto.asymmetric.encrypt(
        symmetricKey,
        nonce,
        this.keystore.asymmetric.key
      );

      this.keystore.symmetric[hash] = {
        nonce,
        symmetricKey,
        encryptedSymmetricKey
      };

      const result = await this.feed.createPost(encryptedDataHash);
      this.datastore.post[hash] = {
        encryptedDataHash,
        address: result.address,
        feed: this.datastore.feed.address
      };

      return result;
    } catch (err) {
      throw err;
    }
  }
}

export default ErasureClient;
