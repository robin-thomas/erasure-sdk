import Ipfs from "ipfs";

import config from "../config.json";

const IPFS = {
  ipfs: null,

  getClient: () => {
    if (IPFS.ipfs === null) {
      IPFS.ipfs = new Ipfs(config.host, config.port, {
        protocol: config.protocol
      });
    }

    return IPFS.ipfs;
  },

  add: async data => {
    try {
      const content = Buffer.from(data);

      const results = await IPFS.getClient().add(content);
      return results[0].hash;
    } catch (err) {
      throw err;
    }
  }
};

export default IPFS;
