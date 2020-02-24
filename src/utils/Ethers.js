import { ethers } from "ethers";

const Ethers = {
  /**
   * create a new ethers provider (returns metamask if already injected)
   *
   * @returns {Object} ethers provider
   */
  getProvider: (ethersProvider = null) => {
    if (ethersProvider !== null) {
      return ethersProvider;
    }

    if (typeof window !== "undefined" && window.ethereum !== undefined) {
      window.ethereum.autoRefreshOnNetworkChange = false;
      ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
    }

    return ethersProvider;
  },

  /**
   * returns ethers signer
   *
   * @returns {Object} ethers signer
   */
  getWallet: (ethersProvider = null) => {
    try {
      return Ethers.getProvider(ethersProvider).getSigner();
    } catch (err) {
      return null;
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

  getAddress: address => {
    if (address.length > 42) {
      address = "0x" + address.slice(-40);
    }
    return ethers.utils.getAddress(address);
  },

  parseEther: ether => ethers.utils.parseEther(ether),
  formatEther: wei => ethers.utils.formatEther(wei),
  bigNumberify: value => ethers.utils.bigNumberify(value),
  hexlify: value => ethers.utils.hexlify(value),

  getAccount: async (ethersProvider = null) => {
    return await Ethers.getWallet(ethersProvider).getAddress();
  },

  MaxUint256: () => ethers.constants.MaxUint256,
  AddressZero: () => ethers.constants.AddressZero,
};

export default Ethers;
