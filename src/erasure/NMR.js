import { ethers } from "ethers";

import Ethers from "../utils/Ethers";

import { abi as contractAbi } from "../../artifacts/NMR.json";
import { abi as mockContractAbi } from "../../artifacts/MockNMR.json";

class NMR {
  #registry = {};
  #network = null;
  #contract = null;
  #ethersProvider = null;

  /**
   * @constructor
   * @param {Object} config
   * @param {address} config.registry
   * @param {string} config.network
   * @param {Object} config.ethersProvider
   */
  constructor({ registry, network, ethersProvider }) {
    this.#network = network;
    this.#ethersProvider = ethersProvider;

    if (process.env.NODE_ENV === "test") {
      this.#registry = registry.NMR;
      this.#contract = new ethers.Contract(
        this.#registry,
        mockContractAbi,
        Ethers.getWallet(this.#ethersProvider)
      );
    } else {
      this.#registry = Object.keys(registry).reduce((p, network) => {
        p[network] = registry[network].NMR;
        return p;
      }, {});

      if (network === "homestead") {
        this.#contract = new ethers.Contract(
          this.#registry[this.#network],
          contractAbi,
          Ethers.getWallet(this.#ethersProvider)
        );
      } else {
        this.#contract = new ethers.Contract(
          this.#registry[this.#network],
          mockContractAbi,
          Ethers.getWallet(this.#ethersProvider)
        );
      }
    }
  }

  /**
   * Change the approval so that NMR could be staked
   *
   * @param {string} spender - griefing instance address
   * @returns {Promise} receipt of the changeApproval transaction
   */
  approve = async (spender, value) => {
    try {
      const tx = await this.#contract.approve(spender, value);
      return await tx.wait();
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
