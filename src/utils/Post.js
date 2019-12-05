import Box from "./3Box";
import IPFS from "./IPFS";

const Post = {
  getMetadata: async proofHash => {
    try {
      const staticMetadataB58 = IPFS.sha256ToHash(proofHash);

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
