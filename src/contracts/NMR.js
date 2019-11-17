import CryptoIPFS from "@erasure/crypto-ipfs";

import Ethers from "../utils/Ethers";
import Contract from "../utils/Contract";

import contract from "../../artifacts/NMR.json";
import mockContract from "../../artifacts/MockNMR.json";

class NMR {
  /**
   * NMR
   *
   * @constructor
   * @param {Object} config - configuration for NMR
   * @param {string} config.network - eth network string
   */
  constructor({ network }) {
    this.network = network;

    this.contract = new Contract({
      network,
      abi: this.getAbi(),
      contractName: "NMR"
    });
  }

  /**
   * Returns the contract abi
   *
   * @returns {Object} contract abi
   */
  getAbi() {
    return this.network === "rinkeby" ? mockContract.abi : contract.abi;
  }

  /**
   * Updates the address of the contract
   *
   * @param {string} address - address of the new contract instance
   */
  setAddress(address) {
    this.contract = this.contract.setContract(this.getAbi(), address);
  }

  /**
   * Change the approval so that NMR could be staked
   *
   * @param {string} spender - griefing instance address
   * @returns {Promise} receipt of the changeApproval transaction
   */
  async changeApproval(spender) {
    try {
      const tx = await this.contract.contract.changeApproval(
        spender,
        0,
        Ethers.MaxUint256()
      );
      const txReceipt = await tx.wait();

      return txReceipt;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Mints some mock NMR tokens
   *
   * @param {string} to - address to transfer some mock NMR tokens
   * @param {string} value - wei amount of NMR to transfer
   * @returns {Promise} receipt of the mintMockTokens transaction
   */
  async mintMockTokens(to, value) {
    try {
      const tx = await this.contract.contract.mintMockTokens(to, value);
      const txReceipt = await tx.wait();

      return txReceipt;
    } catch (err) {
      throw err;
    }
  }
}

export default NMR;
