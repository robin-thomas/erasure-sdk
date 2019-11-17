import Web3 from "./Web3";
import Utils from "./Utils";

import contracts from "../contracts.json";

class Contract {
  /**
   * Contract
   *
   * @constructor
   * @param {Object} config - configuration for Contract
   * @param {string} [config.network] - eth network string
   * @param {Object} config.web3 - web3 object
   * @param {Object} [config.contract] - new contract address
   * @param {Object} config.abi - contract abi
   */
  constructor({ network, contract, abi, web3 }) {
    this.web3 = web3;

    this.address = web3.utils.isAddress(contract)
      ? contract
      : Contract.getAddress(contract, network);

    this.setContract(abi, this.address);
  }

  /**
   * Creates a new web3 contract object
   *
   * @param {Object} abi - contract abi
   * @param {string} address - contract address
   * @returns {Object} this object
   */
  setContract(abi, address) {
    if (abi !== undefined && abi !== null) {
      this.address = address;
      this.contract = new this.web3.eth.Contract(abi, address);
    }

    return this;
  }

  /**
   * Invokes a function in the smart contract
   *
   * @param {string} fnName - smart contract function name
   * @param {boolean} needGas - need gas to execute the function
   * @param {Array} args - smart contract function arguments
   * @returns {Promise} transaction receipt of smart contract function invocation
   */
  async invokeFn(fnName, needGas, ...args) {
    try {
      const _fn = this.contract.methods[fnName](...args);

      if (!needGas) {
        const accounts = await this.web3.eth.getAccounts();

        return await _fn.call({ from: accounts[0] });
      } else {
        return await Web3.sendSignedTx(this.address, _fn, this.web3);
      }
    } catch (err) {
      throw err;
    }
  }

  /**
   * Retrieves the contract json artifact
   *
   * @param {string} contract - contract address
   * @param {string} network - eth network
   * @returns {Object} contract json artifact
   */
  static getAddress(contract, network) {
    try {
      if (contract === "OneWayGriefing_Factory") {
        return contracts["v1.0.0"][network].OneWayGriefing_Factory;
      } else if (contract === "NMR") {
        return contracts["v1.1.0"][network].NMR;
      }

      return contracts["v1.0.0"][network][contract];
    } catch (err) {
      throw new Error(`Contract address not found: ${contract}, ${network}`);
    }
  }
}

export default Contract;
