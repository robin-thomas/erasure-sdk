import Box from "./3Box";
import IPFS from "./IPFS";

const Post = {
  getMetadata: async (feedAddress, proofHash) => {
    try {
      let boxFeed = await Box.get(Box.DATASTORE_FEEDS);
      if (boxFeed === null || boxFeed[feedAddress] === undefined) {
        throw new Error(`Unable to find feed: ${feedAddress}`);
      }
      if (boxFeed[feedAddress].posts[proofHash] === undefined) {
        throw new Error(
          `Unable to find proofHash: ${proofHash} in feed: ${feedAddress}`
        );
      }

      const staticMetadataB58 =
        boxFeed[feedAddress].posts[proofHash].staticMetadataB58;

      console.log("address", staticMetadataB58);

      const metadata = await IPFS.get(staticMetadataB58);
      let { nonce, encryptedSymmetricKey, encryptedPostIpfsHash } = JSON.parse(
        metadata
      );
      nonce = new Uint8Array(nonce.split(","));
      encryptedSymmetricKey = new Uint8Array(encryptedSymmetricKey.split(","));

      return {
        nonce,
        encryptedSymmetricKey,
        encryptedPostIpfsHash
      };
    } catch (err) {
      throw err;
    }
  }
};

export default Post;
