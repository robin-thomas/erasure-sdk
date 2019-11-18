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
   * @param {string} currentStake - current staked amount
   * @param {string} amountToAdd - amount (in NMR) to be added to the stake
   * @returns {Promise} receipt of the staking transaction
   */
  async increaseStake(currentStake, amountToAdd) {
    try {
      amountToAdd = Ethers.bigNumberify(amountToAdd);
      currentStake = Ethers.bigNumberify(currentStake);

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
}

export default CountdownGriefing;
