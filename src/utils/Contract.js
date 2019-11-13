import Web3 from "./Web3";
import Utils from "./Utils";
import Network from "./Network";

class Contract {
  constructor(network, web3, contract) {
    this.web3 = web3;

    setNetwork(network);
    setContract(contract);
  }

  setNetwork(network = null) {
    if (network) {
      this.network = network;
      this.networkId = Network.toNetworkId(network);
    }

    return this;
  }

  setContract(contract = null) {
    if (contract) {
      this.contractAddress = contract.networks[this.networkId].address;

      this.contract = new this.web3.eth.Contract(
        contract.abi,
        contract.networks[this._networkId].address
      );
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
        return await Web3.sendSignedTx(this.contractAddress, _fn, this.web3);
      }
    } catch (err) {
      throw err;
    }
  }
}

export default Contract;
