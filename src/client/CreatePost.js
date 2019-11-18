import Box from "../utils/3Box";
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
      (await Box.get(Box.KEYSTORE_ASYMMETRIC)).key
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

    let postData = await Box.get(Box.DATASTORE_POSTS);
    postData[ipfsHash] = {
      metadata,
      feed: (await Box.get(Box.DATASTORE_FEED)).address,
      timestamp: new Date().toISOString()
    };
    await Box.set(Box.DATASTORE_POSTS, postData);

    return {
      ipfsHash,
      txReceipt
    };
  } catch (err) {
    throw err;
  }
};

export default CreatePost;
