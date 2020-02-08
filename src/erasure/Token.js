import { ethers } from "ethers";
import { constants } from "@erasure/crypto-ipfs";

import Ethers from "../utils/Ethers";

class Token {
  #dai = null;
  #nmr = null;

  /**
   * @constructor
   * @param {Object} config
   * @param {Object} config.dai
   * @param {Object} config.nmr
   */
  constructor({ dai, nmr }) {
    this.#dai = dai;
    this.#nmr = nmr;
  }

  /**
   * Change the approval so that token could be staked
   *
   * @param {string} spender - griefing instance address
   * @returns {Promise}
   */
  approve = async (tokenID, spender, value) => {
    try {
      switch (tokenID) {
        case constants.TOKEN_TYPES.NMR:
          return await this.#nmr.changeApproval(
            spender,
            await this.#nmr.allowance(spender),
            value,
          );

        case constants.TOKEN_TYPES.DAI:
          return await this.#dai.approve(spender, value);
      }
    } catch (err) {
      throw err;
    }
  };

  /**
   * Mints some mock tokens
   *
   * @param {string} to - address to transfer some mock tokens
   * @param {string} value - wei amount of tokens to transfer
   * @returns {Promise}
   */
  mintMockTokens = async (tokenID, to, value) => {
    try {
      switch (tokenID) {
        case constants.TOKEN_TYPES.NMR:
          await this.#nmr.mintMockTokens(to, value);
          break;

        case constants.TOKEN_TYPES.DAI:
          await this.#dai.mintMockTokens(to, value);
          break;
      }
    } catch (err) {
      throw err;
    }
  };
}

export default Token;
