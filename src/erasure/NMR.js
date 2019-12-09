import { ethers } from "ethers";
import CryptoIPFS from "@erasure/crypto-ipfs";

import Ethers from "../utils/Ethers";

import contract from "../../artifacts/NMR.json";
import mockContract from "../../artifacts/MockNMR.json";

class NMR {
  #registry = {};
  #network = null;
  #contract = null;

  constructor({ registry, network }) {
    this.#network = network;

    if (process.env.NODE_ENV === "test") {
      this.#registry = registry.NMR;
      this.#contract = new ethers.Contract(
        this.#registry,
        mockContract.abi,
        Ethers.getWallet()
      );
    } else {
      this.#registry = Object.keys(registry).reduce((p, network) => {
        p[network] = registry[network].NMR;
        return p;
      }, {});

      if (network === "homestead") {
        this.#contract = new ethers.Contract(
          this.#registry[this.#network],
          contract.abi,
          Ethers.getWallet()
        );
      } else {
        this.#contract = new ethers.Contract(
          this.#registry[this.#network],
          mockContract.abi,
          Ethers.getWallet()
        );
      }
    }

    // Listen for any metamask changes.
    if (typeof window !== "undefined" && window.ethereum !== undefined) {
      window.ethereum.on("accountsChanged", function() {
        if (process.env.NODE_ENV === "test") {
          this.#contract = new ethers.Contract(
            this.#registry,
            mockContract.abi,
            Ethers.getWallet()
          );
        } else if (network === "homestead") {
          this.#contract = new ethers.Contract(
            this.#registry[this.#network],
            contract.abi,
            Ethers.getWallet()
          );
        } else {
          this.#contract = new ethers.Contract(
            this.#registry[this.#network],
            mockContract.abi,
            Ethers.getWallet()
          );
        }
      });
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
