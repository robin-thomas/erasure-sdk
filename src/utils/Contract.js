import { ethers } from 'ethers'

import Config from "./Config";
import Ethers from "./Ethers";

const Contract = {
  contract: (name, address = null) => {
    switch (name) {
      case "DAI":
        name = "MockERC20";
        address = Config.store.registry.DAI;
        break;

      case "NMR":
        name = "MockNMR";
        address = Config.store.registry.NMR;
        break;
    }

    const { abi } = require(`@erasure/abis/src/${Config.store.protocolVersion}/abis/${name}.json`);

    const contract = new ethers.Contract(
      address ? address : Config.store.registry[name],
      abi,
      Ethers.getWallet(Config.store.ethersProvider),
    );

    const fnTxList = Object.keys(contract.interface.functions).reduce((p, c) => {
      if (contract.interface.functions[c].type === "transaction") {
        p[c] = c;
      }

      return p;
    }, {});

    const isAuthereum = Config.store.web3Provider.currentProvider.isAuthereum;

    const functions = Object.keys(contract.functions).reduce((p, fn) => {
      p[fn] = (...args) => {
        // Support for sponsored transactions.
        if (fnTxList[fn] !== undefined) {
          if (isAuthereum && Config.store.authereum.txConfig) {
            return contract[fn](...args, Config.store.authereum.txConfig);
          }
        }
        return contract[fn](...args);
      }
      return p;
    }, {});

    return {
      ...contract,
      ...functions,
    };
  }
};

export default Contract;
