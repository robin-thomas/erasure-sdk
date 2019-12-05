import Box from "../utils/3Box";
import IPFS from "../utils/IPFS";
import Post from "../utils/Post";
import Crypto from "../utils/Crypto";

/**
 * Reveal an encrypted post so that others can view it
 *
 * @param {string} proofHash - ipfs hash of what the unencrypted post will be
 * @returns {Promise} ipfs hash of the unencrypted post
 */
const RevealPost = async function(proofHash) {
  try {
    const keypair = await Box.getKeyPair();
    if (keypair === null) {
      throw new Error("Unable to retrieve the keypair");
    }

    const {
      nonce,
      encryptedSymmetricKey,
      encryptedPostIpfsHash
    } = await Post.getMetadata(proofHash);

    // Download the encryptedPost from ipfs
    const encryptedPost = await IPFS.get(encryptedPostIpfsHash);

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
