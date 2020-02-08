import { ethers } from 'ethers'

import Box from '../utils/3Box'
import Config from '../utils/Config'
import Crypto from '../utils/Crypto'
import Contract from '../utils/Contract'
import Ethers from '../utils/Ethers'

class Erasure_Users {
  #contract = null

  constructor() {
    this.#contract = Contract.contract("Erasure_Users");
  }

  /**
   * Register the PubKey of the user
   *
   * @returns {Promise} transaction receipt
   */
  registerUser = async () => {
    // Check if the user alrady exists in Box storage.
    let keypair = await Box.getKeyPair(Config.store.web3Provider)
    if (keypair === null) {
      keypair = await Crypto.asymmetric.genKeyPair(Config.store.ethersProvider)
      Box.setKeyPair(keypair, Config.store.web3Provider)
    }

    // Register the publicKey in Erasure_Users.
    const publicKey = Buffer.from(keypair.key.publicKey).toString('hex')
    const address = await Ethers.getAccount(Config.store.ethersProvider)
    const data = await this.getUserData(address)

    if (data === null || data === undefined || data === '0x') {
      const tx = await this.#contract.registerUser(`0x${publicKey}`)
      return await tx.wait()
    }
  }

  /**
   * Retrieve the PubKey of a registered user
   *
   * @param {string} address
   * @returns {Promise} userData
   */
  getUserData = async address => {
    try {
      return await this.#contract.getUserData(address)
    } catch (err) {
      throw err
    }
  }
}

export default Erasure_Users
