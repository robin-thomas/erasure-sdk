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

    let keypair = await Box.getKeyPair();
    if (keypair === null) {
      keypair = await Crypto.asymmetric.genKeyPair();
      Box.setKeyPair(keypair);
    }

    const nonce = Crypto.asymmetric.genNonce();
    const encryptedSymmetricKey = Crypto.asymmetric.encrypt(
      symmetricKey,
      nonce,
      keypair
    );

    // Get the IPFS hash of the post
    // without uploading it to IPFS.
    const ipfsHash = await IPFS.getHash(post);

    const metadata = {
      nonce: nonce.toString(),
      ipfsHash,
      erasurePost: this.version,
      encryptedSymmetricKey: encryptedSymmetricKey.toString(),
      encryptedPostIpfsHash
    };

    const txReceipt = await this.feed.submitHash(metadata);

    const feed = await Box.get(Box.DATASTORE_FEED);
    let postData = await Box.get(Box.DATASTORE_POSTS);
    if (postData === null) {
      postData = {};
    }
    postData[ipfsHash] = {
      metadata,
      feed: feed ? feed.address : null,
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
