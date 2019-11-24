import Box from "../utils/3Box";
import IPFS from "../utils/IPFS";
import Crypto from "../utils/Crypto";

/**
 * Reveal an encrypted post so that others can view it
 *
 * @param {string} feedAddress
 * @param {string} ipfsHash - ipfs hash of what the unencrypted post will be
 * @returns {Promise} ipfs hash of the unencrypted post
 */
const RevealPost = async function(feedAddress, proofHash) {
  try {
    let boxFeed = await Box.get(Box.DATASTORE_FEEDS);
    if (boxFeed === null || boxFeed[feedAddress] === undefined) {
      throw new Error(`Unable to find feed: ${feedAddress}`);
    }

    // Retrieve the proofHash details.
    const metadata = await IPFS.get(proofHash);
    let { nonce, encryptedSymmetricKey, encryptedPostIpfsHash } = JSON.parse(
      metadata
    );
    nonce = new Uint8Array(nonce.split(","));
    encryptedSymmetricKey = new Uint8Array(encryptedSymmetricKey.split(","));

    // Download the encryptedPost from ipfs
    const encryptedPost = await IPFS.get(encryptedPostIpfsHash);

    const keypair = await Box.getKeyPair();
    if (keypair === null) {
      throw new Error("Unable to retrieve the keypair");
    }

    // Decrypt the content.
    const symmetricKey = Crypto.asymmetric.decrypt(
      encryptedSymmetricKey,
      nonce,
      keypair
    );
    const post = Crypto.symmetric.decrypt(symmetricKey, encryptedPost);

    // Upload the decrypted data to ipfs.
    // Returns the IPFS hash.
    return await IPFS.add(post);
  } catch (err) {
    throw err;
  }
};

export default RevealPost;
