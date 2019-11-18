import { ethers } from "ethers";

const Ethers = {
  /**
   * create a new ethers provider (returns metamask if already injected)
   *
   * @returns {Object} ethers provider
   */
  getProvider: () => {
    let provider = null;

    if (typeof window !== "undefined" && window.ethereum !== undefined) {
      provider = new ethers.providers.Web3Provider(window.ethereum);
    } else {
      provider = new ethers.providers.JsonRpcProvider();
    }

    return provider;
  },

  // TODO: add support for metamask.
  getWallet: () => {
    let wallet = null;
    if (process.env.NODE_ENV === "test") {
      const keys = require("../../test/test.json");
      wallet = ethers.Wallet.fromMnemonic(keys.metamask.mnemonic).connect(
        new ethers.providers.JsonRpcProvider()
      );
    }

    return wallet;
  },

  isAddress: address => {
    try {
      ethers.utils.getAddress(address);
      return true;
    } catch (err) {
      return false;
    }
  },
  parseEther: ether => ethers.utils.parseEther(ether),
  formatEther: wei => ethers.utils.formatEther(wei),
  getAccount: () => Ethers.getWallet().address,
  bigNumberify: value => ethers.utils.bigNumberify(value),

  MaxUint256: () => ethers.constants.MaxUint256
};

export default Ethers;
