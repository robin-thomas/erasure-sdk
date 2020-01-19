import { ethers } from "ethers";
import IdentityWallet from "identity-wallet";
import { AuthereumSigner } from "authereum";

const Ethers = {
  /**
   * create a new ethers provider (returns metamask if already injected)
   *
   * @returns {Object} ethers provider
   */
  getProvider: (box = null) => {
    let provider = null;

    if (typeof window !== "undefined" && window.ethereum !== undefined) {
      window.ethereum.autoRefreshOnNetworkChange = false;
      provider = new ethers.providers.Web3Provider(window.ethereum);
    } else if (process.env.NODE_ENV === "test") {
      if (box === null) {
        provider = new ethers.providers.JsonRpcProvider();
      } else {
        const keys = require("../../test/test.json");

        const idWallet = new IdentityWallet(() => true /* getConsent */, {
          seed: ethers.utils.HDNode.mnemonicToSeed(keys.metamask.mnemonic)
        });

        provider = idWallet.get3idProvider();
      }
    }

    return provider;
  },

  /**
   * returns ethers signer
   *
   * @returns {Object} ethers signer
   */
  getWallet: (web3Provider = null) => {
    if (process.env.NODE_ENV === "test") {
      const keys = require("../../test/test.json");

      return ethers.Wallet.fromMnemonic(keys.metamask.mnemonic).connect(
        new ethers.providers.JsonRpcProvider()
      );
    }

    try {
      if (web3Provider !== null) {
        if (web3Provider.currentProvider.isAuthereum) {
          return new AuthereumSigner(
            web3Provider.currentProvider.authereum.networkName
          );
        }
        return web3Provider.getSigner();
      }

      return Ethers.getProvider().getSigner();
    } catch (err) {
      return null;
    }
  },

  /**
   * retrieves the eth network name
   *
   * @param {Function} callback - callback function
   */
  getNetworkSync: callback => {
    try {
      Ethers.getProvider()
        .getNetwork()
        .then(net => callback(net.name))
        .catch(console.error);
    } catch (err) {}
  },

  // refer: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md
  getNetworkName: networkId => {
    switch (networkId) {
      case 1:
        return "homestead";
      case 4:
        return "rinkeby";
    }
  },

  /**
   * checks if an address is valid
   *
   * @param {string} address
   * @returns {Boolean} returns true if input is an address
   */
  isAddress: address => {
    try {
      ethers.utils.getAddress(address);
      return true;
    } catch (err) {
      return false;
    }
  },
  getAddress: hex => {
    const address = ethers.utils.hexStripZeros(hex);
    if (address === "0x0") {
      return hex;
    }

    return ethers.utils.getAddress(address);
  },

  parseEther: ether => ethers.utils.parseEther(ether),
  formatEther: wei => ethers.utils.formatEther(wei),
  bigNumberify: value => ethers.utils.bigNumberify(value),
  hexlify: value => ethers.utils.hexlify(value),

  getAccount: async (web3Provider = null) => {
    if (web3Provider !== null && web3Provider.currentProvider.isAuthereum) {
      return (await web3Provider.eth.getAccounts())[0];
    }

    return await Ethers.getWallet(web3Provider).getAddress();
  },

  MaxUint256: () => ethers.constants.MaxUint256,
  AddressZero: () => ethers.constants.AddressZero
};

export default Ethers;
