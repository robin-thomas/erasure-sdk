import { ethers } from "ethers";

const Utils = {
  /**
   * sleep for given milliseconds.
   *
   * @param {number} ms - amount to sleep (in milliseconds)
   * @returns {Promise} - wait
   */
  sleep: ms => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  hexlify: utf8str => ethers.utils.hexlify(ethers.utils.toUtf8Bytes(utf8str)),
  hash: utf8str => ethers.utils.keccak256(Utils.hexlify(utf8str))
};

export default Utils;
