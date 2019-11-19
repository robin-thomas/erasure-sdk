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
   * @param {Object} [config.contractName] - new contract address
   * @param {Object} [config.network] - network name
   * @param {Object} [config.registry] - for running tests
   */
  constructor({ contractName, abi, registry, network }) {
    this.abi = abi;
    this.wallet = Ethers.getWallet();
    this.contractName = contractName;

    if (registry && Ethers.isAddress(registry[contractName])) {
      this.address = registry[contractName];
    } else {
      this.address = Contract.getAddress(contractName, network);

      // Update the contract object on network change.
      let onNetworkChange = function(network) {
        switch (network) {
          case 1:
            this.updateNetwork("mainnet");
            break;

          case 4:
            this.updateNetwork("rinkeby");
            break;
        }
      };
      onNetworkChange = onNetworkChange.bind(this);

      window.ethereum.on("networkChanged", onNetworkChange);
    }

    this.setContract(this.address);
  }

  updateNetwork(network) {
    const address = Contract.getAddress(this.contractName, network);
    this.setContract(address);
  }

  /**
   * Creates a new ethers contract object
   *
   * @param {Object} abi - contract abi
   * @param {string} address - contract address
   * @returns {Object} this object
   */
  setContract(address) {
    if (address) {
      this.contract = new ethers.Contract(address, this.abi, this.wallet);
    }
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
      return ethers.constants.AddressZero;
    }
  }
}

export default Contract;
