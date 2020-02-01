import { openBox } from '3box'

import Ethers from './Ethers'

import { app } from '../config.json'

const Box = {
  space: null,

  DATASTORE_FEEDS: 'feeds',
  DATASTORE_GRIEFINGS: 'griefings',

  KEYSTORE_SYMMETRIC: 'symmetric',
  KEYSTORE_ASYMMETRIC: 'asymmetric',

  /**
   * create a new 3Box space client
   *
   * @returns {Object} authenticated 3Box space client
   */
  getClient: async (web3Provider = null) => {
    if (Box.space === null) {
      const account = (await web3Provider.eth.getAccounts())[0]
      const box = await openBox(account, web3Provider.currentProvider)

      await box.syncDone
      Box.space = await box.openSpace(app.name)
    }

    return Box.space
  },

  /**
   * Add/update a new value to the 3Box space
   *
   * @param {Object} key
   * @param {Object} value
   */
  set: async (key, value, web3Provider = null) => {
    try {
      const client = await Box.getClient(web3Provider)
      await client.private.set(key, value)
    } catch (err) {
      throw err
    }
  },

  /**
   * Retrieve value from the 3Box space
   *
   * @param {Object} key
   * @returns {Object} value
   */
  get: async (key, web3Provider = null) => {
    try {
      const client = await Box.getClient(web3Provider)
      return await client.private.get(key)
    } catch (err) {
      throw err
    }
  },

  /**
   * Retrieve the keypair stored.
   * We use this, because 3Box cannot store Uint8Arrays
   *
   * @returns {Object} keypair
   */
  getKeyPair: async (web3Provider = null) => {
    const keypair = await Box.get(Box.KEYSTORE_ASYMMETRIC, web3Provider)
    if (keypair === null) {
      return null
    }

    return {
      ...keypair,
      key: {
        publicKey: new Uint8Array(keypair.key.publicKey.split(',')),
        secretKey: new Uint8Array(keypair.key.secretKey.split(',')),
      },
    }
  },

  /**
   * Store a new keypair
   * We use this, because 3Box cannot store Uint8Arrays
   *
   */
  setKeyPair: async (keypair, web3Provider = null) => {
    await Box.set(
      Box.KEYSTORE_ASYMMETRIC,
      {
        ...keypair,
        key: {
          publicKey: keypair.key.publicKey.toString(),
          secretKey: keypair.key.secretKey.toString(),
        },
      },
      web3Provider,
    )
  },

  getSymKey: async (keyhash, web3Provider = null) => {
    const keystore = await Box.get(Box.KEYSTORE_SYMMETRIC, web3Provider)
    if (keystore === null || keystore[keyhash] === undefined) {
      return null
    }

    return keystore[keyhash]
  },

  setSymKey: async (keyhash, key, web3Provider = null) => {
    let keystore = await Box.get(Box.KEYSTORE_SYMMETRIC, web3Provider)
    if (keystore === null) {
      keystore = {}
    }

    keystore[keyhash] = key

    await Box.set(Box.KEYSTORE_SYMMETRIC, keystore, web3Provider)
  },
}

export default Box
