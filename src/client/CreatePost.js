import IPFS from "../utils/IPFS";
import Crypto from "../utils/Crypto";

/**
 * Submits new post hash
 *
 * @param {string} post - data to be posted
 * @returns {Promise} transaction receipt of new post
 */
const CreatePost = async function(post) {
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

    const txReceipt = await this.feed.submitHash(metadata);

    this.datastore.post.posts[ipfsHash] = {
      metadata,
      feed: this.datastore.feed.address,
      timestamp: new Date().toISOString()
    };

    return {
      ipfsHash,
      txReceipt
    };
  } catch (err) {
    throw err;
  }
};

export default CreatePost;
