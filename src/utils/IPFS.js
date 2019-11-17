import Ipfs from "ipfs-http-client";
import cryptoIpfs from "@erasure/crypto-ipfs";

import config from "../config.json";

const IPFS = {
  ipfs: null,

  /**
   * create a new IPFS client
   *
   * @returns {Object} ipfs http client
   */
  getClient: () => {
    if (IPFS.ipfs === null) {
      IPFS.ipfs = new Ipfs(config.ipfs.host, config.ipfs.port, {
        protocol: config.ipfs.protocol
      });
    }

    return IPFS.ipfs;
  },

  /**
   * upload file to the ipfs
   *
   * @param {string} data - data to be uploaded to ipfs
   * @returns {Promise} ipfs hash
   */
  add: async data => {
    try {
      const content = Ipfs.Buffer.from(data);
      const results = await IPFS.getClient().add(content);
      return results[0].hash;
    } catch (err) {
      throw err;
    }
  },

  /**
   * download file from the ipfs
   *
   * @param {string} hash - download file from the ipfs hash
   * @returns {string} data downloaded from ipfs
   */
  get: async hash => {
    try {
      const results = await IPFS.getClient().get(hash);
      return results[0].content.toString();
    } catch (err) {
      throw err;
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
      return await cryptoIpfs.ipfs.onlyHash(data);
    } catch (err) {
      throw err;
    }
  }
};

export default IPFS;
