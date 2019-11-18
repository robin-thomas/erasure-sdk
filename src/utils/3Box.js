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
      const box = await ThreeBox.openBox(
        Ethers.getAccount(),
        Ethers.getProvider(),
        {}
      );
      await box.syncDone;

      Box.space = await box.openSpace(config.app.name);
    }

    return Box.space;
  },

  set: async (key, value) => {
    try {
      await Box.getClient().private.set(key, value);
    } catch (err) {
      throw err;
    }
  },

  get: async (key, value) => {
    try {
      return await Box.getClient().private.get(key);
    } catch (err) {
      return {};
    }
  }
};

export default Box;
