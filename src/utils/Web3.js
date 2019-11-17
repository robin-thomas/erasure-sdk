import Web3New from "web3";
import HDWalletProvider from "@truffle/hdwallet-provider";

import Utils from "./Utils";

const Web3 = {
  /**
   * create a new web3 provider (returns metamask if already injected)
   *
   * @param {string} infura - infura api endpoint
   * @param {string} [mnemonic] - metamask mnemonic
   * @returns {Array} web3 provider
   */
  getWeb3Provider: (infura, mnemonic = null) => {
    let enable = false;
    let provider = null;

    if (typeof window !== "undefined" && window.ethereum !== undefined) {
      provider = window.ethereum;
      enable = true;
    } else if (mnemonic) {
      provider = new HDWalletProvider(mnemonic, infura);
    } else {
      provider = new Web3New.providers.HttpProvider(infura);
    }

    return [provider, enable];
  },

  /**
   * create a new web3 object
   *
   * @param {Object} [provider] - web3 provider
   * @param {Object} config - configuration for new web3 object
   * @param {string} [config.infura] - infura api endpoint
   * @param {string} [config.mnemonic] - metamask mnemonic
   * @returns {Object} web3 object
   */
  getWeb3: (provider = null, { infura, mnemonic = null }) => {
    let enable = false;
    if (provider === null) {
      [provider, enable] = Web3.getWeb3Provider(infura, mnemonic);
    }

    const web3 = new Web3New(provider);
    if (enable) {
      provider.enable();
    }

    return web3;
  },

  /**
   * send a signed transaction
   *
   * @param {string} contractAddress - smart contract address
   * @param {Object} fn - smart contract function object
   * @param {Object} web3 - web3 object
   * @returns {Promise} transaction receipt
   */
  sendSignedTx: async (contractAddress, fn, web3) => {
    try {
      const accounts = await web3.eth.getAccounts();

      const tx = {
        from: accounts[0],
        to: contractAddress,
        data: fn.encodeABI()
      };

      const signedTx = await web3.eth.signTransaction(tx, tx.from);
      return await web3.eth.sendSignedTransaction(signedTx.raw);
    } catch (err) {
      throw err;
    }
  }
};

export default Web3;
