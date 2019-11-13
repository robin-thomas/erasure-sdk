import Web3 from "./Web3";
import Utils from "./Utils";

import contracts from "../contracts.json";

const getAddress = (contract, network) => {
  try {
    if (contract === "OneWayGriefing_Factory") {
      return contracts["v1.0.0"][network].OneWayGriefing_Factory;
    }

    return contracts["v1.1.0"][network][contract];
  } catch (err) {
    throw new Error(`Contract address not found: ${contract}, ${network}`);
  }
};

class Contract {
  constructor({ network, contract, abi, web3 }) {
    this.web3 = web3;

    this.address = getAddress(contract, network);
    setContract(abi, this.address);
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
}

export default Contract;
