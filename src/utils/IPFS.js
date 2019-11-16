import Ipfs from "ipfs-http-client";
import cryptoIpfs from "@erasure/crypto-ipfs";

import config from "../config.json";

const IPFS = {
  ipfs: null,

  getClient: () => {
    if (IPFS.ipfs === null) {
      IPFS.ipfs = new Ipfs(config.ipfs.host, config.ipfs.port, {
        protocol: config.ipfs.protocol
      });
    }

    return IPFS.ipfs;
  },

  add: async data => {
    try {
      const content = Ipfs.Buffer.from(data);
      const results = await IPFS.getClient().add(content);
      return results[0].hash;
    } catch (err) {
      throw err;
    }
  },

  get: async hash => {
    try {
      const results = await IPFS.getClient().get(hash);
      return results[0].content.toString();
    } catch (err) {
      throw err;
    }
  },

  getHash: async data => {
    try {
      return await cryptoIpfs.ipfs.onlyHash(data);
    } catch (err) {
      throw err;
    }
  }
};

export default IPFS;
