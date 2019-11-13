import Web3New from "web3";
// import HDWalletProvider from "@truffle/hdwallet-provider";

import Utils from "./Utils";

const Web = {
  // Check if a web3 provider like metamask is already injected.
  // If yes, use that.
  getWeb3Provider: (infura, mnemonic = null) => {
    let enable = false;
    let provider = null;

    if (window.ethereum) {
      provider = window.ethereum;
      enable = true;
    } else if (mnemonic) {
      // provider = new HDWalletProvider(mnemonic, infura);
    } else {
      provider = new Web3New.providers.HttpProvider(infura);
    }

    return [provider, enable];
  },

  getWeb3: (provider = null, { infura, mneomic = null }) => {
    if (provider === null) {
      [provider] = Web3.getWeb3Provider(infura, mneomic);
    }

    return new Web3New(provider);
  },

  sendSignedTx: async (networkId, contractAddress, fn, web3) => {
    try {
      const accounts = await web3.eth.getAccounts();

      const tx = {
        from: accounts[0],
        to: contractAddress,
        data: fn.encodeABI(),
        gas: 8000000,
        gasPrice: web3.utils.toHex(web3.utils.toWei("20", "Gwei"))
      };

      const signedTx = await web3.eth.signTransaction(tx, tx.from);
      return await web3.eth.sendSignedTransaction(signedTx.raw);
    } catch (err) {
      throw err;
    }
  },

  getTxReceipt: async (web3, txHash) => {
    // Wait till the transaction is mined.
    let _receipt = null;
    while (true) {
      _receipt = await web3.eth.getTransactionReceipt(txHash);
      if (_receipt !== null) {
        break;
      }

      await Utils.sleep(1000 /* 1s */);
    }

    return _receipt;
  },

  getTx: async (web3, txHash) => {
    const _receipt = await Web3.getTxReceipt(web3, txHash);

    try {
      if (_receipt.status === true) {
        // Return tx details.
        return await web3.eth.getTransaction(txHash);
      }

      throw new Error(`Transaction ${txHash} has failed`);
    } catch (err) {
      throw err;
    }
  }
};

export default Web3;
