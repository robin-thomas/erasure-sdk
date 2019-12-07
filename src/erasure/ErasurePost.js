import { ethers } from "ethers";

import Box from "../utils/3Box";
import IPFS from "../utils/IPFS";
import Crypto from "../utils/Crypto";
import Ethers from "../utils/Ethers";

class ErasurePost {
  #owner = null;
  #proofhash = null;
  #feedAddress = null;
  #protocolVersion = "";

  /**
   * @constructor
   * @param {Object} config
   * @param {address} config.owner
   * @param {string} config.proofhash
   * @param {address} config.feedAddress
   * @param {string} config.protocolVersion
   */
  constructor({ owner, proofhash, feedAddress, protocolVersion }) {
    this.#owner = owner;
    this.#proofhash = proofhash;
    this.#feedAddress = feedAddress;
    this.#protocolVersion = protocolVersion;
  }

  /**
   * Get the proofhash of this post
   *
   * @returns {string} bytes32 sha256 proofhash
   * @returns {string} base58 multihash format of the proofhash
   */
  proofhash = () => {
    return {
      proofhash: this.#proofhash,
      multihash: IPFS.sha256ToHash(this.#proofhash)
    };
  };

  /**
   *
   * Get the address of the owner of this post
   *
   * @returns {Promise} address of the owner
   */
  owner = () => {
    return this.#owner;
  };

  metadata = async () => {
    const staticMetadataB58 = IPFS.sha256ToHash(this.#proofhash);

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
  };

  /**
   *
   * Reveal this post publically
   * - fetch symkey and upload to ipfs
   *
   * @returns {Promise} base58 multihash format of the ipfs address of the revealed key
   */
  reveal = async () => {
    try {
      const keypair = await Box.getKeyPair();
      if (keypair === null) {
        throw new Error("Unable to retrieve the keypair");
      }

      const {
        nonce,
        encryptedSymmetricKey,
        encryptedPostIpfsHash
      } = await this.metadata();

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
}

export default ErasurePost;
