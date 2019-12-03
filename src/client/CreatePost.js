import Box from "../utils/3Box";
import IPFS from "../utils/IPFS";
import Utils from "../utils/Utils";
import Crypto from "../utils/Crypto";
import Ethers from "../utils/Ethers";

const crypto = async post => {
  const keypair = await Box.getKeyPair();
  if (keypair === null) {
    throw new Error("Cannot find the keypair of this user!");
  }

  const symmetricKey = Crypto.symmetric.genKey();
  const encryptedPost = Crypto.symmetric.encrypt(symmetricKey, post);
  const encryptedPostIpfsHash = await IPFS.add(encryptedPost);

  // Nonce is set per post.
  const nonce = Crypto.asymmetric.genNonce();
  const encryptedSymmetricKey = Crypto.asymmetric.encrypt(
    symmetricKey,
    nonce,
    keypair
  );

  return {
    nonce: nonce.toString(),
    encryptedSymmetricKey: encryptedSymmetricKey.toString(),
    encryptedPostIpfsHash
  };
};

/**
 * Submits new post hash
 *
 * @param {string} post - data to be posted
 * @param {string} feedAddress - feed to where this post should be added
 * @returns {Promise} transaction receipt of new post
 */
const CreatePost = async function(post, feedAddress) {
  try {
    let boxFeed = await Box.get(Box.DATASTORE_FEEDS);
    if (boxFeed === null || boxFeed[feedAddress] === undefined) {
      throw new Error(`Unable to find feed: ${feedAddress}`);
    }

    // Get the IPFS hash of the post without uploading it to IPFS.
    const ipfsHash = await IPFS.getHash(post);

    const metadata = await crypto(post);
    const staticMetadataB58 = await IPFS.add(
      JSON.stringify({
        ...metadata,
        ipfsHash,
        erasurePost: this.appVersion
      })
    );
    const proofHash = Utils.hash(staticMetadataB58);

    this.feed.setAddress(feedAddress);
    await this.feed.submitHash(proofHash);

    boxFeed[feedAddress].posts[proofHash] = {
      proofHash,
      staticMetadataB58,
      feed: feedAddress,
      createdTimestamp: new Date().toISOString()
    };
    await Box.set(Box.DATASTORE_FEEDS, boxFeed);

    return proofHash;
  } catch (err) {
    throw err;
  }
};

export default CreatePost;
