import { ethers } from "ethers";

import Config from "../utils/Config";
import Contract from "../utils/Contract";
import Ethers from "../utils/Ethers";

class NMR {
  #contract = null;

  /**
   * @constructor
   */
  constructor() {
    this.#contract = Contract.contract("NMR");
  }

  /**
   * Retrieve the amount of tokens that an owner allowed to a spender.
   *
   * @returns {Promise} allowance
   */
  allowance = async spender => {
    try {
      const user = await Ethers.getAccount(Config.store.ethersProvider);
      return this.#contract.allowance(user, spender);
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
    newValue = Ethers.MaxUint256(),
  ) => {
    try {
      const tx = await this.#contract.changeApproval(
        spender,
        oldValue,
        newValue,
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
