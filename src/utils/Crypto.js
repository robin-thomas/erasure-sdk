import crypto from "crypto";
import cryptoIpfs from "@erasure/crypto-ipfs";

import Ethers from "./Ethers";

const Crypto = {
  symmetric: {
    /**
     * generate a new symmetric key
     *
     * @returns {string} symmetric key
     */
    genKey: () => cryptoIpfs.crypto.symmetric.generateKey(),

    /**
     * encrypt a message
     *
     * @param {string} msg - string to be encrypted
     * @param {string} key - symmetric key
     * @returns {string} encrypted string
     */
    encrypt: (key, msg) => cryptoIpfs.crypto.symmetric.encryptMessage(key, msg),

    /**
     * decrypt an encrypted message
     *
     * @param {string} msg - string to be decrypted
     * @param {string} key - symmetric key
     * @returns {string} decrypted string
     */
    decrypt: (key, msg) => cryptoIpfs.crypto.symmetric.decryptMessage(key, msg)
  },

  asymmetric: {
    /**
     * generate a new keypair
     *
     * @param {Object} web3 - web3 object
     * @returns {Promise} keypair
     */
    genKeyPair: async () => {
      try {
        const operator = Ethers.getAccount();

        const msg = `I am signing this message to generate my ErasureClient keypair as ${operator}`;
        const signature = await Ethers.getWallet().signMessage(msg);

        const salt = crypto
          .createHash("sha256")
          .update(operator)
          .digest("base64");

        const key = cryptoIpfs.crypto.asymmetric.generateKeyPair(
          signature,
          salt
        );

        return {
          msg,
          signature,
          key,
          salt
        };
      } catch (err) {
        throw err;
      }
    },

    /**
     * generate a random nonce
     *
     * @returns {string} nonce
     */
    genNonce: () => cryptoIpfs.crypto.asymmetric.generateNonce(),

    /**
     * encrypt a message
     *
     * @param {string} msg - string to be encrypted
     * @param {string} nonce - nonce
     * @param {string} keypair - secret key, public key
     * @returns {string} encrypted string
     */
    encrypt: (msg, nonce, keypair) =>
      cryptoIpfs.crypto.asymmetric.encryptMessage(
        msg,
        nonce,
        keypair.publicKey,
        keypair.secretKey
      ),

    /**
     * decrypt an encrypted message
     *
     * @param {string} msg - string to be decrypted
     * @param {string} nonce - nonce
     * @param {string} keypair - secret key, public key
     * @returns {string} decrypted string
     */
    decrypt: (msg, nonce, keypair) =>
      cryptoIpfs.crypto.asymmetric.decryptMessage(
        msg,
        nonce,
        keypair.publicKey,
        keypair.secretKey
      )
  }
};

export default Crypto;
