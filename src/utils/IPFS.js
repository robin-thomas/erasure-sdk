import Ipfs from 'ipfs-http-client'
import { multihash } from '@erasure/crypto-ipfs'

import Config from './Config'

const IPFS = {
  ipfs: null,
  keystore: {},

  /**
   * create a new IPFS client
   *
   * @returns {Object} ipfs http client
   */
  getClient: () => {
    if (IPFS.ipfs === null) {
      IPFS.ipfs = new Ipfs({
        host: Config.store.ipfs.host,
        port: Config.store.ipfs.port,
        protocol: Config.store.ipfs.protocol,
      })
    }

    return IPFS.ipfs
  },

  /**
   * upload file to the ipfs
   *
   * @param {string} data - data to be uploaded to ipfs
   * @returns {Promise} ipfs hash
   */
  add: async (data) => {
    try {
      const content = Buffer.from(data)
      const results = await IPFS.getClient().add(content)
      return results[0].hash
    } catch (err) {
      throw err
    }
  },

  /**
   * download file from the ipfs
   *
   * @param {string} hash - download file from the ipfs hash
   * @returns {string} data downloaded from ipfs
   */
  get: async (hash) => {
    try {
      const results = await IPFS.getClient().get(hash)
      return results[0].content.toString()
    } catch (err) {
      throw err
    }
  },

  /**
   * get ipfs hash of the data without uploading to ipfs
   *
   * @param {string} data - data whose ipfs hash to be generated
   * @returns {Promise} ipfs hash of the data
   */
  getHash: async data => {
    try {
      if (data === '') {
        return 'QmaRwA91m9Rdfaq9u3FH1fdMVxw1wFPjKL38czkWMxh3KB'
      }

      return await multihash({
        input: data,
        inputType: 'raw',
        outputType: 'b58',
      })
    } catch (err) {
      throw err
    }
  },

  hashToHex: async hash => {
    try {
      return await multihash({
        input: hash,
        inputType: 'b58',
        outputType: 'hex',
      })
    } catch (err) {
      throw err
    }
  },

  isHash: async hash => {
    try {
      await IPFS.hashToHex(hash)
      return true
    } catch (err) {
      return false
    }
  },
}

export default IPFS
