import { ethers } from "ethers";

import Config from "../utils/Config";
import Ethers from "../utils/Ethers";

import { abi } from "@erasure/abis/src/v1.3.0/abis/MockNMR.json";

class NMR {
  #contract = null;

  /**
   * @constructor
   */
  constructor() {
    this.#contract = new ethers.Contract(
      Config.store.registry.NMR,
      abi,
      Ethers.getWallet(Config.store.ethersProvider)
    );
  }

  /**
   * Retrieve the amount of tokens that an owner allowed to a spender.
   *
   * @returns {Promise} allowance
   */
  allowance = async spender => {
    try {
      const operator = await Ethers.getAccount(Config.store.ethersProvider);

      return this.#contract.allowance(operator, spender);
    } catch (err) {
      throw err;
    }
  };

  /**
   * Change the approval so that NMR could be staked
   *
   * @param {string} spender - griefing instance address
   * @returns {Promise} receipt of the changeApproval transaction
   */
  changeApproval = async (
    spender,
    oldValue = 0,
    newValue = Ethers.MaxUint256()
  ) => {
    try {
      const tx = await this.#contract.changeApproval(
        spender,
        oldValue,
        newValue
      );
      return await tx.wait();
    } catch (err) {
      throw err;
    }
  };

  /**
   * Mints some mock NMR tokens
   *
   * @param {string} to - address to transfer some mock NMR tokens
   * @param {string} value - wei amount of NMR to transfer
   * @returns {Promise} receipt of the mintMockTokens transaction
   */
  mintMockTokens = async (to, value) => {
    try {
      const tx = await this.#contract.mintMockTokens(to, value);
      return await tx.wait();
    } catch (err) {
      throw err;
    }
  };
}

export default NMR;
