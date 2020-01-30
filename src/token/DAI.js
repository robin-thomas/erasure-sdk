import { ethers } from "ethers";

import Ethers from "../utils/Ethers";

import { abi } from "@erasure/abis/src/v1.3.0/abis/MockERC20.json";

class DAI {
  #registry = {};
  #network = null;
  #contract = null;
  #ethersProvider = null;

  /**
   * @constructor
   * @param {Object} config
   * @param {string} config.network
   * @param {Object} config.ethersProvider
   */
  constructor({ registry, network, ethersProvider }) {
    this.#network = network;
    this.#ethersProvider = ethersProvider;

    if (process.env.NODE_ENV === "test") {
      this.#registry = registry.DAI;
      this.#contract = new ethers.Contract(
        this.#registry,
        abi,
        Ethers.getWallet(this.#ethersProvider)
      );
    } else {
      this.#registry = Object.keys(registry).reduce((p, network) => {
        p[network] = registry[network].DAI;
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
