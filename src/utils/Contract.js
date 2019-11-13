import Web3 from "./Web3";
import Utils from "./Utils";
import Network from "./Network";

import address from "../contracts.json";

class Contract {
  constructor(network, web3, abi, address) {
    this.web3 = web3;

    setNetwork(network);
    setContract(abi, address);
  }

  setNetwork(network = null) {
    if (network) {
      this.network = network;
      this.networkId = Network.toNetworkId(network);
    }

    return this;
  }

  setContract(abi, address) {
    if (abi !== undefined && abi !== null) {
      this.address = address;

      this.contract = new this.web3.eth.Contract(abi, address);
    }

    return this;
  }

  // This function is used to invoke a function in the smart contract.
  // isPure will be set for functions that do not change state.
  // ...args are passed to the contract function.
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

  getAddress(contract, network) {
    try {
      if (contract === "OneWayGriefing_Factory") {
        return address["v1.0.0"][network].OneWayGriefing_Factory;
      }

      return address["v1.1.0"][network][contract];
    } catch (err) {
      throw new Error(`Contract address not found: ${contract}, ${network}`);
    }
  }
}

export default Contract;
