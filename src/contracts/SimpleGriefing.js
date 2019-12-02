import CryptoIPFS from "@erasure/crypto-ipfs";

import IPFS from "../utils/IPFS";
import Ethers from "../utils/Ethers";
import Contract from "../utils/Contract";

import contract from "../../artifacts/SimpleGriefing.json";

class SimpleGriefing {
  /**
   * CountdownGriefing
   *
   * @constructor
   * @param {Object} config - configuration for CountdownGriefing
   * @param {Object} [config.registry] - for testing purposes
   */
  constructor({ registry }) {
    this.contract = new Contract({
      abi: contract.abi,
      contractName: "SimpleGriefing",
      registry
    });
  }

  /**
   * Login to metamask
   *
   */
  async login() {
    return await this.contract.login();
  }

  /**
   * Update the contract address of the CountdownGriefing
   *
   * @param {string} address - address of the new contract instance
   */
  setAddress(address) {
    this.contract.setContract(address);
  }

  /**
   * Increase the staking amount
   *
   * @param {BigNumber} currentStake - current staked amount
   * @param {BigNumber} amountToAdd - amount (in NMR) to be added to the stake
   * @returns {Promise} receipt of the staking transaction
   */
  async increaseStake(currentStake, amountToAdd) {
    try {
      const tx = await this.contract.contract.increaseStake(
        currentStake,
        amountToAdd
      );

      return await tx.wait();
    } catch (err) {
      throw err;
    }
  }

  /**
   * Punish the user
   *
   * @param {BigNumber} currentStake - current staked amount
   * @param {BigNumber} amountToAdd - amount to be rewarded
   * @returns {Promise} receipt of the reward transaction
   */
  async reward(currentStake, amountToAdd) {
    try {
      const tx = await this.contract.contract.reward(currentStake, amountToAdd);

      return await tx.wait();
    } catch (err) {
      throw err;
    }
  }

  /**
   * Punish the user
   *
   * @param {BigNumber} currentStake - current staked amount
   * @param {BigNumber} punishAmount - amount (in NMR) to be burnt from the stake
   * @param {string} message - message
   * @returns {Promise} receipt of the punishment transaction
   */
  async punish(currentStake, punishAmount, message) {
    try {
      const tx = await this.contract.contract.punish(
        currentStake,
        punishAmount,
        Buffer.from(message)
      );

      return await tx.wait();
    } catch (err) {
      throw err;
    }
  }

  /**
   * Release some stake to the staker
   *
   * @param {BigNumber} currentStake - current staked amount
   * @param {BigNumber} amountToRelease - amount (in NMR) to be released to staker
   * @returns {Promise} receipt of the release stake transaction
   */
  async releaseStake(currentStake, amountToRelease) {
    try {
      const tx = await this.contract.contract.releaseStake(
        currentStake,
        amountToRelease
      );

      return await tx.wait();
    } catch (err) {
      throw err;
    }
  }

  /**
   * Update the agreement metadata
   *
   * @param {string} metadata
   * @returns {Promise}
   */
  async setMetadata(metadata) {
    try {
      const data = JSON.stringify(metadata, null, 4);
      const ipfsHash = await IPFS.add(data);
      const staticMetadata = CryptoIPFS.ipfs.hashToHex(ipfsHash);

      const tx = await this.contract.contract.setMetadata(
        Buffer.from(staticMetadata)
      );
      return await tx.wait();
    } catch (err) {
      throw err;
    }
  }
}

export default SimpleGriefing;
