import bs58 from "bs58";
import Ipfs from "ipfs-http-client";
import cryptoIpfs from "@erasure/crypto-ipfs";

import config from "../config.json";

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
  add: async (data, retry = true) => {
    try {
      if (process.env.NODE_ENV === "test") {
        const hash = await IPFS.getHash(data);
        IPFS.keystore[hash] = data;
        return hash;
      }

      const content = Buffer.from(data);
      const results = await IPFS.getClient().add(content);
      return results[0].hash;
    } catch (err) {
      if (retry) {
        return await IPFS.add(data, false);
      } else {
        throw err;
      }
    }
  },

  /**
   * download file from the ipfs
   *
   * @param {string} hash - download file from the ipfs hash
   * @returns {string} data downloaded from ipfs
   */
  get: async (hash, retry = true) => {
    try {
      if (process.env.NODE_ENV === "test") {
        return IPFS.keystore[hash];
      }

      const results = await IPFS.getClient().get(hash);
      return results[0].content.toString();
    } catch (err) {
      if (retry) {
        return await IPFS.get(hash, false);
      } else {
        throw err;
      }
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
  },

  hashToSha256: hash =>
    bs58
      .decode(hash)
      .toString("hex")
      .replace("1220", "0x"),
  sha256ToHash: hex => IPFS.hexToHash(`0x1220${hex.substr(2)}`),
  hexToHash: hex => bs58.encode(Buffer.from(hex.substr(2), "hex")),
  hexToSha256: hex => `0x${hex.substr(6)}` // IPFS adds 0x1220 prefix
};

export default IPFS;
