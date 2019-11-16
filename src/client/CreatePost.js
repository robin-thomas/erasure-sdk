import IPFS from "../utils/IPFS";
import Crypto from "../utils/Crypto";

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

    const result = await this.feed.createPost(ipfsHash, metadata);

    this.datastore.post.posts[ipfsHash] = {
      metadata,
      address: result.address,
      feed: this.datastore.feed.address,
      timestamp: new Date().toISOString()
    };

    return result;
  } catch (err) {
    throw err;
  }
};

export default CreatePost;
