import CryptoIPFS from "@erasure/crypto-ipfs";

import Abi from "../utils/Abi";
import IPFS from "../utils/IPFS";
import Ethers from "../utils/Ethers";
import Contract from "../utils/Contract";

import contract from "../../artifacts/Erasure_Users.json";

class Erasure_Users {
  /**
   * Erasure_Users
   *
   * @constructor
   * @param {Object} config - configuration for Erasure_Users
   * @param {Object} [config.registry] - for testing purposes
   */
  constructor(opts) {
    const contractName = "Erasure_Users";

    this.contract = new Contract({
      abi: contract.abi,
      contractName,
      ...opts
    });
  }

  /**
   * Register the PubKey of the user
   *
   * @param {string} data - pubKey of the user
   * @returns {Promise} tx receipt
   */
  async registerUser(pubKey) {
    try {
      // Register the user only if not registered before.
      const address = await Ethers.getAccount();
      const data = await this.getUserData(address);

      if (data === null || data === undefined || data === "0x") {
        const hex = Ethers.hexlify(`0x${pubKey}`);
        const tx = await this.contract.contract.registerUser(hex);
        return await tx.wait();
      }
    } catch (err) {
      throw err;
    }
  }

  /**
   * Retrieve the PubKey of a registered user
   *
   * @param {string} address
   * @returns {Promise} userData
   */
  async getUserData(address) {
    try {
      return await this.contract.contract.getUserData(address);
    } catch (err) {
      throw err;
    }
  }
}

export default Erasure_Users;
