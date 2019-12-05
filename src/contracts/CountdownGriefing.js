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
   * @param {Object} [config.registry] - for testing purposes
   */
  constructor({ registry, protocolVersion }) {
    this.contract = new Contract({
      abi: contract.abi,
      contractName: "CountdownGriefing",
      registry,
      protocolVersion
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
   * @param {BigNumber} amountToAdd - amount (in NMR) to be added to the stake
   * @returns {Promise} receipt of the staking transaction
   */
  async increaseStake(amountToAdd) {
    try {
      const tx = await this.contract.contract.increaseStake(amountToAdd);
      return await tx.wait();
    } catch (err) {
      throw err;
    }
  }

  /**
   * Punish the user
   *
   * @param {BigNumber} punishAmount - amount (in NMR) to be burnt from the stake
   * @param {string} message - message
   * @returns {Promise} receipt of the punishment transaction
   */
  async punish(punishAmount, message) {
    try {
      const tx = await this.contract.contract.punish(
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
   * @param {BigNumber} amountToRelease - amount (in NMR) to be released to staker
   * @returns {Promise} receipt of the release stake transaction
   */
  async releaseStake(amountToRelease) {
    try {
      const tx = await this.contract.contract.releaseStake(amountToRelease);
      return await tx.wait();
    } catch (err) {
      throw err;
    }
  }

  /**
   * Retrieve the stake
   *
   * @param {string} recipient - recipient to receive the stake
   * @returns {Promise} receipt of the retrieve stake transaction
   */
  async retrieveStake(recipient) {
    try {
      const tx = await this.contract.contract.retrieveStake(recipient);
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
      const data = JSON.stringify(metadata);
      const ipfsHash = await IPFS.add(data);
      const staticMetadata = CryptoIPFS.ipfs.hashToHex(ipfsHash);

      const tx = await this.contract.contract.setMetadata(staticMetadata);
      return await tx.wait();
    } catch (err) {
      throw err;
    }
  }
}

export default CountdownGriefing;
