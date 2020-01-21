import ThreeBox from "3box";

import Ethers from "./Ethers";

import config from "../config.json";

const ethProvider = wallet => {
  return {
    send: (data, callback) => {
      if (data.method === "personal_sign") {
        wallet
          .signMessage(data.params[0])
          .then(result => callback(null, { result }));
      } else {
        callback(null, "0x");
      }
    }
  };
};

const Box = {
  space: null,

  DATASTORE_FEEDS: "feeds",
  DATASTORE_GRIEFINGS: "griefings",

  KEYSTORE_SYMMETRIC: "symmetric",
  KEYSTORE_ASYMMETRIC: "asymmetric",

  /**
   * create a new 3Box space client
   *
   * @returns {Object} authenticated 3Box space client
   */
  getClient: async (web3Provider = null) => {
    if (Box.space === null) {
      let box;
      if (web3Provider !== null) {
        const account = await Ethers.getAccount();

        if (process.env.NODE_ENV === "test") {
          const wallet = web3Provider.getSigner();
          box = await ThreeBox.openBox(account, ethProvider(wallet));
        } else {
          box = await ThreeBox.openBox(account, web3Provider.currentProvider);
        }
      } else {
        box = await ThreeBox.openBox(null, Ethers.getProvider(true));
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
  set: async (key, value, web3Provider = null) => {
    try {
      const client = await Box.getClient(web3Provider);
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
  get: async (key, web3Provider = null) => {
    try {
      const client = await Box.getClient(web3Provider);
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
  getKeyPair: async (web3Provider = null) => {
    const keypair = await Box.get(Box.KEYSTORE_ASYMMETRIC, web3Provider);
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
  setKeyPair: async (keypair, web3Provider = null) => {
    await Box.set(
      Box.KEYSTORE_ASYMMETRIC,
      {
        ...keypair,
        key: {
          publicKey: keypair.key.publicKey.toString(),
          secretKey: keypair.key.secretKey.toString()
        }
      },
      web3Provider
    );
  },

  getSymKey: async keyhash => {
    const keystore = await Box.get(Box.KEYSTORE_SYMMETRIC);
    if (keystore === null || keystore[keyhash] === undefined) {
      return null;
    }

    return keystore[keyhash];
  },

  setSymKey: async (keyhash, key) => {
    let keystore = await Box.get(Box.KEYSTORE_SYMMETRIC);
    if (keystore === null) {
      keystore = {};
    }

    keystore[keyhash] = key;

    await Box.set(Box.KEYSTORE_SYMMETRIC, keystore);
  }
};

export default Box;
