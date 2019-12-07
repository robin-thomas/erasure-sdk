import { ethers } from "ethers";

import Box from "../utils/3Box";
import Crypto from "../utils/Crypto";
import Ethers from "../utils/Ethers";

import contract from "../../artifacts/Erasure_Users.json";

class Erasure_Users {
  #registry = {};
  #network = null;
  #contract = null;

  constructor({ registry, network }) {
    this.#network = network;

    if (process.env.NODE_ENV === "test") {
      this.#registry = registry.Erasure_Users;
      this.#contract = new ethers.Contract(
        this.#registry,
        contract.abi,
        Ethers.getWallet()
      );
    } else {
      this.#registry = Object.keys(registry).reduce((p, network) => {
        p[network] = registry[network].Erasure_Users;
        return p;
      }, {});

      this.#contract = new ethers.Contract(
        this.#registry[this.#network],
        contract.abi,
        Ethers.getWallet()
      );
    }

    // Listen for any metamask changes.
    if (typeof window !== "undefined" && window.ethereum !== undefined) {
      window.ethereum.on("accountsChanged", function() {
        if (process.env.NODE_ENV === "test") {
          this.#contract = new ethers.Contract(
            this.#registry,
            contract.abi,
            Ethers.getWallet()
          );
        } else {
          this.#contract = new ethers.Contract(
            this.#registry[this.#network],
            contract.abi,
            Ethers.getWallet()
          );
        }
      });
    }
  }

  /**
   * Register the PubKey of the user
   *
   * @returns {Promise} transaction receipt
   */
  registerUser = async () => {
    // Check if the user alrady exists in Box storage.
    let keypair = await Box.getKeyPair();
    if (keypair === null) {
      keypair = await Crypto.asymmetric.genKeyPair();
      Box.setKeyPair(keypair);
    }

    // Register the publicKey in Erasure_Users.
    const publicKey = Buffer.from(keypair.key.publicKey).toString("hex");

    const address = await Ethers.getAccount();
    const data = await this.getUserData(address);

    if (data === null || data === undefined || data === "0x") {
      const hex = Ethers.hexlify(`0x${publicKey}`);
      const tx = await this.#contract.registerUser(hex);
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
