import ThreeBox from "3box";

import Ethers from "./Ethers";

import config from "../config.json";

const Box = {
  space: null,

  DATASTORE_FEED: "feed",
  DATASTORE_POST: "post",
  DATASTORE_POSTS: "posts",
  DATASTORE_GRIEFING: "griefing",
  DATASTORE_GRIEFINGS: "griefings",

  KEYSTORE_ASYMMETRIC: "asymmetric",

  getClient: async () => {
    if (Box.space === null) {
      const box = await ThreeBox.openBox(null, Ethers.getProvider());
      await box.syncDone;

      Box.space = await box.openSpace(config.app.name);
    }

    return Box.space;
  },

  set: async (key, value) => {
    try {
      const client = await Box.getClient();
      await client.private.set(key, value);
    } catch (err) {
      throw err;
    }
  },

  get: async (key, value) => {
    try {
      const client = await Box.getClient();
      return await client.private.get(key);
    } catch (err) {
      return {};
    }
  },

  getKeyPair: async () => {
    const keypair = await Box.get(Box.KEYSTORE_ASYMMETRIC);

    return {
      ...keypair,
      key: {
        publicKey: new Uint8Array(keypair.key.publicKey.split(",")),
        secretKey: new Uint8Array(keypair.key.secretKey.split(","))
      }
    };
  },

  setKeyPair: async keypair => {
    await Box.set(Box.KEYSTORE_ASYMMETRIC, {
      ...keypair,
      key: {
        publicKey: keypair.key.publicKey.toString(),
        secretKey: keypair.key.secretKey.toString()
      }
    });
  }
};

export default Box;
