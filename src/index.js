import NMR from "./contracts/NMR";
import Feed from "./contracts/Feed";
import Feed_Factory from "./contracts/Feed_Factory";
import OneWayGriefing_Factory from "./contracts/OneWayGriefing_Factory";

import Web3 from "./utils/Web3";

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
      this.datastore.feed.timestamp = new Date().toISOString();

      // Feed contract has been created.
      // Update the contract object.
      this.feed.setAddress(this.datastore.feed.address);

      return this.datastore.feed;
    } catch (err) {
      throw err;
    }
  }

  // Create a new post.
  async createPost(post) {
    try {
      const symmetricKey = Crypto.symmetric.genKey();
      const encryptedPost = Crypto.symmetric.encrypt(symmetricKey, post);
      const encryptedPostIpfsHash = await IPFS.add(encryptedPost);

      const nonce = Crypto.asymmetric.genNonce();
      const encryptedSymmetricKey = Crypto.asymmetric.encrypt(
        symmetricKey,
        nonce,
        this.keystore.asymmetric.key
      );

      // Get the IPFS hash of the post
      // without uploaded it to IPFS.
      const ipfsHash = await IPFS.getHash(post);

      const metadata = {
        nonce,
        ipfsHash,
        erasurePost: this.version,
        encryptedSymmetricKey,
        encryptedPostIpfsHash
      };

      const result = await this.feed.createPost(ipfsHash, metadata);

      this.datastore.post.posts[result.address] = {
        metadata,
        feed: this.datastore.feed.address,
        timestamp: new Date().toISOString()
      };

      return result;
    } catch (err) {
      throw err;
    }
  }

  // Reveal an encrypted post
  // so that others can view it.
  async revealPost(postAddress) {
    try {
      // Get the encrypted ipfs hash from the post address
      const {
        nonce,
        encryptedSymmetricKey,
        encryptedPostIpfsHash
      } = this.datastore.post.posts[postAddress].metadata;

      // Download it from ipfs
      const encryptedPost = await IPFS.get(encryptedPostIpfsHash);

      // Decrypt the content.
      const symmetricKey = Crypto.asymmetric.decrypt(
        encryptedSymmetricKey,
        nonce,
        this.keystore.asymmetric.key
      );
      const post = Crypto.symmetric.decrypt(symmetricKey, encryptedPost);

      // Upload the decrypted data to ipfs.
      // Returns the IPFS hash.
      return await IPFS.add(post);
    } catch (err) {
      throw err;
    }
  }
}

export default ErasureClient;
