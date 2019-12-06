import { ethers } from "ethers";

import Ethers from "./Ethers";

import config from "../config.json";
import contracts from "../contracts.json";

const accountChange = function() {
  this.setContract(this.address);
};

const networkChange = function(network) {
  this.network = network;

  if (process.env.NODE_ENV === "test") {
    this.setContract(this.registry[this.contractName]);
  } else {
    this.setContract(this.registry[network][this.contractName]);
  }
};

class Contract {
  /**
   * Contract
   *
   * @constructor
   * @param {Object} config - configuration for Contract
   * @param {Object} config.abi - contract abi
   * @param {Object} [config.contractName] - new contract address
   * @param {Object} config.protocolVersion - erasure protocolVersion
   * @param {Object} [config.registry] - for running tests
   */
  constructor({ abi, contractName, network, registry }) {
    this.abi = abi;
    this.network = network;
    this.registry = registry;
    this.contractName = contractName;

    if (process.env.NODE_ENV === "test") {
      this.setContract(registry[contractName]);
    } else {
      this.setContract(registry[network][contractName]);
    }

    // Listen for any metamask changes.
    if (typeof window !== "undefined" && window.ethereum !== undefined) {
      window.ethereum.on("networkChanged", function(networkId) {
        const network = Ethers.getNetworkName(networkId);
        networkChange.bind(this)(network);
      });
      window.ethereum.on("accountsChanged", accountChange.bind(this));
    }
  }

  /**
   * Login to metamask
   *
   */
  async login() {
    if (typeof window !== "undefined" && window.ethereum !== undefined) {
      console.log("Logging you in");
      await window.ethereum.enable();

      const network = await Ethers.getProvider().getNetwork();

      if (network.name === "homestead" || network.name === "rinkeby") {
        networkChange.bind(this)(network);
      } else {
        throw new Error("Only mainnet and rinkeby networks are supported!");
      }
    } else if (process.env.NODE_ENV !== "test") {
      throw new Error("Metamask not detected!");
    }
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
      this.address = address;
      this.wallet = Ethers.getWallet();

      // NMR contract.
      if (this.abi.homestead !== undefined) {
        if (process.env.NODE_ENV === "test") {
          this.network = "rinkeby";
        }

        if (this.abi[this.network] !== undefined) {
          this.contract = new ethers.Contract(
            address,
            this.abi[this.network],
            this.wallet
          );
        }
      } else {
        this.contract = new ethers.Contract(address, this.abi, this.wallet);
      }
    }
  }
}

export default Contract;
