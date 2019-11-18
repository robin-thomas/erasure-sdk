import CryptoIPFS from "@erasure/crypto-ipfs";

import IPFS from "../utils/IPFS";
import Ethers from "../utils/Ethers";
import Contract from "../utils/Contract";

import contract from "../../artifacts/CountdownGriefing.json";

class CountdownGriefing {
  /**
   * CountdownGriefing
   *
   * @constructor
   * @param {Object} config - configuration for CountdownGriefing
   * @param {string} config.network - eth network string
   */
  constructor({ network, registry }) {
    this.network = network;

    this.contract = new Contract({
      network,
      abi: contract.abi,
      contractName: "CountdownGriefing",
      registry
    });
  }

  /**
   * Update the contract address of the CountdownGriefing
   *
   * @param {string} address - address of the new contract instance
   */
  setAddress(address) {
    this.contract = this.contract.setContract(contract.abi, address);
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
      const txReceipt = await tx.wait();

      return txReceipt;
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
      const txReceipt = await tx.wait();

      return txReceipt;
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
      const txReceipt = await tx.wait();

      return txReceipt;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Retrieve the stake
   *
   * @param {string} config.recipient - recipient to receive the stake
   * @returns {Promise} receipt of the retrieve stake transaction
   */
  async retrieveStake(recipient) {
    try {
      const tx = await this.contract.contract.retrieveStake(recipient);
      const txReceipt = await tx.wait();

      return txReceipt;
    } catch (err) {
      throw err;
    }
  }
}

export default CountdownGriefing;
