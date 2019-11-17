import CryptoIPFS from "@erasure/crypto-ipfs";

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
   * @param {Object} config.web3 - web3 object
   */
  constructor({ network, web3 }) {
    this.web3 = web3;
    this.network = network;

    this.contract = new Contract({
      network,
      web3,
      abi: this.getAbi(),
      contract: "NMR"
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
      const fnName = "changeApproval";
      const fnArgs = [spender, 0, -1 /* max uint256 value */];

      return await this.contract.invokeFn(fnName, true, ...fnArgs);
    } catch (err) {
      throw err;
    }
  }
}

export default NMR;
