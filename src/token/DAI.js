import { ethers } from "ethers";

import Config from "../utils/Config";
import Ethers from "../utils/Ethers";

import { abi } from "@erasure/abis/src/v1.3.0/abis/MockERC20.json";

class DAI {
  #contract = null;

  /**
   * @constructor
   */
  constructor() {
    this.#contract = new ethers.Contract(
      Config.store.registry.DAI,
      abi,
      Ethers.getWallet(Config.store.ethersProvider)
    );
  }

  /**
   * Change the approval so that DAI could be staked
   *
   * @param {string} spender - griefing instance address
   * @returns {Promise} receipt of the approve transaction
   */
  approve = async (spender, value = Ethers.MaxUint256()) => {
    try {
      const tx = await this.#contract.approve(spender, value);
      return await tx.wait();
    } catch (err) {
      throw err;
    }
  };

  /**
   * Mints some mock DAI tokens
   *
   * @param {string} to - address to transfer some mock DAI tokens
   * @param {string} value - wei amount of DAI to transfer
   * @returns {Promise} receipt of the mint transaction
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

export default DAI;
