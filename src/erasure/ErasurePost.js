import { ethers } from "ethers";

import Box from "../utils/3Box";
import IPFS from "../utils/IPFS";
import Crypto from "../utils/Crypto";
import Ethers from "../utils/Ethers";

class ErasurePost {
  #owner = null;
  #numSold = 0;
  #revealed = false;
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

  #metadata = async () => {
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
   * Create a new CountdownGriefingEscrow and deposit stake
   * - only called by owner of post
   * - add proofhash to metadata
   * - add Post owner as staker
   *
   * @param {Object} config - configuration for escrow
   * @param {string} [config.buyer]
   * @param {string} config.paymentAmount
   * @param {string} config.stakeAmount
   * @param {number} config.escrowCountdown
   * @param {string} config.ratio
   * @param {number} config.ratioType
   * @param {number} config.agreementCountdown
   * @returns {Promise} address of the escrow
   * @returns {Promise} address of the agreement
   * @returns {Promise} transaction receipts
   */
  offerSell() {}

  /** getSellOffers
   *
   * Get all escrows to sell this Post
   *
   * @returns {Promise} array of Escrow objects
   */
  getSellOffers() {}

  /** offerBuy
   *
   * Create a new CountdownGriefingEscrow and deposit payment
   * - add proofhash to metadata
   * - add Post owner as staker
   * - add caller as buyer
   *
   * @param {Object} config - configuration for escrow
   * @param {string} config.paymentAmount
   * @param {string} config.stakeAmount
   * @param {number} config.escrowCountdown
   * @param {string} config.ratio
   * @param {number} config.ratioType
   * @param {number} config.agreementCountdown
   * @returns {Promise} address of the escrow
   * @returns {Promise} address of the agreement
   * @returns {Promise} transaction receipts
   */
  offerBuy() {}

  /** getBuyOffers
   *
   * Get all escrows to buy this Post
   *
   * @returns {Promise} array of Escrow objects
   */
  getBuyOffers() {}

  /**
   * Deposit stake on this post (WIP)
   */
  async stake() {}

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
      } = await this.#metadata();

      // Download the encryptedPost from ipfs
      const encryptedPost = await IPFS.get(encryptedPostIpfsHash);

      // Decrypt the content.
      const symmetricKey = Crypto.asymmetric.decrypt(
        encryptedSymmetricKey,
        nonce,
        keypair
      );

      const post = Crypto.symmetric.decrypt(symmetricKey, encryptedPost);
      this.#revealed = true;

      // Upload the decrypted data to ipfs.
      // Returns the IPFS hash.
      return await IPFS.add(post);
    } catch (err) {
      throw err;
    }
  };

  /**
   *
   * Get the status of the post
   *
   * @returns {boolean} revealed bool true if the post is revealed
   * @returns {integer} numSold number of times the post was sold
   */
  checkStatus() {
    return {
      revealed: this.#revealed,
      numSold: this.#numSold
    };
  }
}

export default ErasurePost;
