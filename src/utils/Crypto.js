import { createHash } from 'crypto'
import { crypto as cryptoIpfs } from '@erasure/crypto-ipfs'

import Ethers from './Ethers'

const Crypto = {
  symmetric: {
    /**
     * generate a new symmetric key
     *
     * @returns {string} symmetric key
     */
    genKey: () => cryptoIpfs.symmetric.generateKey(),

    /**
     * encrypt a message
     *
     * @param {string} msg - string to be encrypted
     * @param {string} key - symmetric key
     * @returns {string} encrypted string
     */
    encrypt: (key, msg) => cryptoIpfs.symmetric.encryptMessage(key, msg),

    /**
     * decrypt an encrypted message
     *
     * @param {string} msg - string to be decrypted
     * @param {string} key - symmetric key
     * @returns {string} decrypted string
     */
    decrypt: (key, msg) => cryptoIpfs.symmetric.decryptMessage(key, msg),
  },

  asymmetric: {
    /**
     * generate a new keypair
     *
     * @returns {Promise} keypair
     */
    genKeyPair: async (ethersProvider = null) => {
      try {
        const user = await Ethers.getAccount(ethersProvider)

        const msg = `I am signing this message to generate my ErasureClient keypair as ${user}`
        const signature = await Ethers.getWallet(ethersProvider).signMessage(
          msg,
        )

        const salt = createHash('sha256')
          .update(user)
          .digest('base64')

        const key = cryptoIpfs.asymmetric.generateKeyPair(signature, salt)

        return {
          msg,
          signature,
          key,
          salt,
        }
      } catch (err) {
        throw err
      }
    },

    /**
     * generate a random nonce
     *
     * @returns {string} nonce
     */
    genNonce: () => cryptoIpfs.asymmetric.generateNonce(),

    /**
     * encrypt a message
     *
     * @param {string} msg - string to be encrypted
     * @param {string} nonce - nonce
     * @param {string} keypair - secret key, public key
     * @returns {string} encrypted string
     */
    encrypt: (msg, nonce, keypair) =>
      cryptoIpfs.asymmetric.encryptMessage(
        msg,
        nonce,
        keypair.key.publicKey,
        keypair.key.secretKey,
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
      cryptoIpfs.asymmetric.decryptMessage(
        msg,
        nonce,
        keypair.key.publicKey,
        keypair.key.secretKey,
      ),
  },
}

export default Crypto
