import { ethers } from "ethers";

import Box from "../utils/3Box";
import Crypto from "../utils/Crypto";
import Ethers from "../utils/Ethers";

import { abi } from "../../artifacts/Erasure_Users.json";

class Erasure_Users {
  #registry = {};
  #network = null;
  #contract = null;
  #web3Provider = null;
  #ethersProvider = null;

  constructor({ registry, network, web3Provider, ethersProvider }) {
    this.#network = network;
    this.#web3Provider = web3Provider;
    this.#ethersProvider = ethersProvider;

    if (process.env.NODE_ENV === "test") {
      this.#registry = registry.Erasure_Users;
      this.#contract = new ethers.Contract(
        this.#registry,
        abi,
        Ethers.getWallet(this.#ethersProvider)
      );
    } else {
      this.#registry = Object.keys(registry).reduce((p, network) => {
        p[network] = registry[network].Erasure_Users;
        return p;
      }, {});

      this.#contract = new ethers.Contract(
        this.#registry[this.#network],
        abi,
        Ethers.getWallet(this.#ethersProvider)
      );
    }
  }

  /**
   * Register the PubKey of the user
   *
   * @returns {Promise} transaction receipt
   */
  registerUser = async () => {
    // Check if the user alrady exists in Box storage.
    let keypair = await Box.getKeyPair(this.#web3Provider);
    if (keypair === null) {
      keypair = await Crypto.asymmetric.genKeyPair(this.#ethersProvider);
      Box.setKeyPair(keypair, this.#web3Provider);
    }

    // Register the publicKey in Erasure_Users.
    const publicKey = Buffer.from(keypair.key.publicKey).toString("hex");
    const address = await Ethers.getAccount(this.#ethersProvider);
    const data = await this.getUserData(address);

    if (data === null || data === undefined || data === "0x") {
      const tx = await this.#contract.registerUser(`0x${publicKey}`);
      return await tx.wait();
    }
  };

  /**
   * Retrieve the PubKey of a registered user
   *
   * @param {string} address
   * @returns {Promise} userData
   */
  getUserData = async address => {
    try {
      return await this.#contract.getUserData(address);
    } catch (err) {
      throw err;
    }
  };
}

export default Erasure_Users;
