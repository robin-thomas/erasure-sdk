import Box from "../utils/3Box";
import IPFS from "../utils/IPFS";
import Post from "../utils/Post";
import Crypto from "../utils/Crypto";
import Ethers from "../utils/Ethers";
import Griefing from "../utils/Griefing";

/**
 * Sell a post
 *
 * @param {string} feedAddress
 * @param {string} ipfsHash - ipfs hash of what the unencrypted post will be
 * @returns {Promise} ipfs hash of the unencrypted post
 */
const SellPost = async function(griefingAddress) {
  try {
    const keypair = await Box.getKeyPair();
    if (keypair === null) {
      throw new Error("Unable to retrieve the keypair");
    }

    // Get the seller address from Agreement.
    let griefingData = await Box.get(Box.DATASTORE_GRIEFINGS);
    if (griefingData === null || griefingData[griefingAddress] === undefined) {
      throw new Error(`Unable to find griefing: ${griefingAddress}`);
    }

    const { data, feedAddress, proofHash } = griefingData[griefingAddress];
    const { nonce, encryptedSymmetricKey } = await Post.getMetadata(
      feedAddress,
      proofHash
    );

    // Decrypt the content.
    const symmetricKey = Crypto.asymmetric.decrypt(
      encryptedSymmetricKey,
      nonce,
      keypair
    );

    // Retrieve the seller address.
    // Seller could be operator or counterParty.
    const { operator, counterParty, griefingType } = griefingData[
      griefingAddress
    ];
    const account = await Ethers.getAccount();
    const seller = account === operator ? counterParty : operator;

    // Retrieve the seller publicKey
    const sellerData = await this.erasureUsers.getUserData(seller);
    const publicKey = Ethers.hexlify(sellerData);

    // construct the keypair: buyer publicKey, seller secretKey
    const newKeypair = {
      key: {
        publicKey: Uint8Array.from(Buffer.from(publicKey.substring(2), "hex")),
        secretKey: keypair.key.secretKey
      }
    };

    const encryptedSymKey = Crypto.asymmetric.encrypt(
      symmetricKey,
      nonce,
      newKeypair
    );

    // Submit the encryptedSymmetricKey to the griefing contract.
    this.setGriefing(griefingType, griefingAddress);
    const metadata = JSON.parse(data);
    metadata.encryptedSymmetricKey = encryptedSymKey.toString();
    await this.griefing.setMetadata(metadata);
  } catch (err) {
    throw err;
  }
};

export default SellPost;
