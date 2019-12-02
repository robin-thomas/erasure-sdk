import Box from "../utils/3Box";
import IPFS from "../utils/IPFS";
import Post from "../utils/Post";
import Crypto from "../utils/Crypto";
import Ethers from "../utils/Ethers";
import Griefing from "../utils/Griefing";

/**
 * Buy a post
 *
 * @param {string} griefingAddress
 * @returns {Promise} post that is bought
 */
const BuyPost = async function(griefingAddress) {
  try {
    const keypair = await Box.getKeyPair();
    if (keypair === null) {
      throw new Error("Unable to retrieve the keypair");
    }

    const {
      seller,
      nonce,
      encryptedSymmetricKey,
      encryptedPostIpfsHash
    } = await Griefing.getMetadata(griefingAddress);

    // Retrieve the seller publicKey
    const sellerData = await this.erasureUsers.getUserData(seller);
    const publicKey = Ethers.hexlify(sellerData);

    const newKeypair = {
      key: {
        publicKey: Uint8Array.from(Buffer.from(publicKey.substring(2), "hex")),
        secretKey: keypair.key.secretKey
      }
    };

    // Decrypt the sym key.
    const symmetricKey = Crypto.asymmetric.decrypt(
      encryptedSymmetricKey,
      nonce,
      newKeypair
    );

    const encryptedPost = await IPFS.get(encryptedPostIpfsHash);
    const post = Crypto.symmetric.decrypt(symmetricKey, encryptedPost);
    return post;
  } catch (err) {
    throw err;
  }
};

export default BuyPost;
