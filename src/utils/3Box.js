import ThreeBox from "3box";

import Ethers from "./Ethers";

import config from "../config.json";

const Box = {
  space: null,

  DATASTORE_FEEDS: "feeds",
  DATASTORE_POST: "post",
  DATASTORE_POSTS: "posts",
  DATASTORE_GRIEFING: "griefing",
  DATASTORE_GRIEFINGS: "griefings",

  KEYSTORE_ASYMMETRIC: "asymmetric",

  /**
   * create a new 3Box space client
   *
   * @returns {Object} authenticated 3Box space client
   */
  getClient: async () => {
    if (Box.space === null) {
      let box;
      if (typeof window !== "undefined" && window.ethereum !== undefined) {
        const account = await Ethers.getAccount();
        box = await ThreeBox.openBox(account, window.ethereum);
      } else {
        box = await ThreeBox.openBox(null, Ethers.getProvider());
      }

      await box.syncDone;
      Box.space = await box.openSpace(config.app.name);
    }

    return Box.space;
  },

  /**
   * Add/update a new value to the 3Box space
   *
   * @param {Object} key
   * @param {Object} value
   */
  set: async (key, value) => {
    try {
      const client = await Box.getClient();
      await client.private.set(key, value);
    } catch (err) {
      throw err;
    }
  },

  /**
   * Retrieve value from the 3Box space
   *
   * @param {Object} key
   * @returns {Object} value
   */
  get: async (key, value) => {
    try {
      const client = await Box.getClient();
      return await client.private.get(key);
    } catch (err) {
      throw err;
    }
  },

  /**
   * Retrieve the keypair stored.
   * We use this, because 3Box cannot store Uint8Arrays
   *
   * @returns {Object} keypair
   */
  getKeyPair: async () => {
    const keypair = await Box.get(Box.KEYSTORE_ASYMMETRIC);
    if (keypair === null) {
      return null;
    }

    return {
      ...keypair,
      key: {
        publicKey: new Uint8Array(keypair.key.publicKey.split(",")),
        secretKey: new Uint8Array(keypair.key.secretKey.split(","))
      }
    };
  },

  /**
   * Store a new keypair
   * We use this, because 3Box cannot store Uint8Arrays
   *
   */
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
