import Box from "../utils/3Box";
import IPFS from "../utils/IPFS";
import Crypto from "../utils/Crypto";

/**
 * Reveal an encrypted post so that others can view it
 *
 * @param {string} ipfsHash - ipfs hash of what the unencrypted post will be
 * @returns {Promise} ipfs hash of the unencrypted post
 */
const RevealPost = async function(ipfsHash) {
  try {
    // Get the encrypted ipfs hash from the post address
    const postData = await Box.get(Box.DATASTORE_POSTS);
    if (postData === null || postData[ipfsHash] === undefined) {
      throw new Error(`Unable to find post at: ${ipfsHash}`);
    }

    let { nonce, encryptedSymmetricKey, encryptedPostIpfsHash } = postData[
      ipfsHash
    ].metadata;
    nonce = new Uint8Array(nonce.split(","));
    encryptedSymmetricKey = new Uint8Array(encryptedSymmetricKey.split(","));

    // Download it from ipfs
    const encryptedPost = await IPFS.get(encryptedPostIpfsHash);

    let keypair = await Box.getKeyPair();
    if (keypair === null) {
      throw new Error("Unable to retrieve a keypair");
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
