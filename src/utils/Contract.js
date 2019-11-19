import { ethers } from "ethers";

import Ethers from "./Ethers";

import config from "../config.json";
import contracts from "../contracts.json";

class Contract {
  /**
   * Contract
   *
   * @constructor
   * @param {Object} config - configuration for Contract
   * @param {Object} config.abi - contract abi
   * @param {string} config.network - eth network string
   * @param {Object} [config.contractName] - new contract address
   * @param {Object} [config.registry] - for running tests
   */
  constructor({ network, contractName, abi, registry }) {
    this.wallet = Ethers.getWallet();

    if (registry && Ethers.isAddress(registry[contractName])) {
      this.address = registry[contractName];
    } else {
      this.address = Contract.getAddress(contractName, network);
    }

    this.setContract(abi, this.address);
  }

  /**
   * Creates a new ethers contract object
   *
   * @param {Object} abi - contract abi
   * @param {string} address - contract address
   * @returns {Object} this object
   */
  setContract(abi, address) {
    this.contract = new ethers.Contract(address, abi, this.wallet);
    return this;
  }

  /**
   * Creates a new ethers contract object
   *
   * @param {Object} abi - contract abi
   * @param {string} address - contract address
   * @returns {Object} this object
   */
  newContract(abi, address) {
    return new ethers.Contract(address, abi, this.wallet);
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
      return contracts[config.erasure.contract.version][network][contract];
    } catch (err) {
      throw new Error(`Contract address not found: ${contract}, ${network}`);
    }
  }
}

export default Contract;
