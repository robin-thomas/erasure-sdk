import { ethers } from "ethers";

import Box from "../utils/3Box";
import IPFS from "../utils/IPFS";
import Crypto from "../utils/Crypto";
import Ethers from "../utils/Ethers";
import ErasurePost from "./ErasurePost";

import simpleContract from "../../artifacts/SimpleGriefing.json";
import countdownContract from "../../artifacts/CountdownGriefing.json";

class ErasureAgreement {
  #abi = null;
  #nmr = null;
  #type = "";
  #staker = null;
  #contract = null;
  #counterparty = null;
  #protocolVersion = "";
  #agreementAddress = null;

  /**
   * @constructor
   * @param {Object} config
   * @param {('simple'|'countdown')} config.type
   * @param {address} config.staker
   * @param {address} config.counterparty
   * @param {string} config.protocolVersion
   * @param {string} config.agreementAddress
   */
  constructor({
    type,
    staker,
    counterparty,
    protocolVersion,
    agreementAddress
  }) {
    this.#type = type;
    this.#staker = staker;
    this.#counterparty = counterparty;
    this.#protocolVersion = protocolVersion;
    this.#agreementAddress = agreementAddress;

    if (type === "countdown") {
      this.#abi = countdownContract.abi;
    } else if (type === "simple") {
      this.#abi = simpleContract.abi;
    }

    this.#contract = new ethers.Contract(
      agreementAddress,
      this.#abi,
      Ethers.getWallet()
    );

    // Listen for any metamask changes.
    if (typeof window !== "undefined" && window.ethereum !== undefined) {
      window.ethereum.on("accountsChanged", function() {
        this.#contract = new ethers.Contract(
          agreementAddress,
          this.#abi,
          Ethers.getWallet()
        );
      });
    }
  }

  /**
   * Access the web3 contract class
   *
   * @returns {Object} contract object
   */
  contract = () => {
    return this.#contract;
  };

  /**
   * Get the address of this agreement
   *
   * @returns {address} address of the agreement
   */
  address = () => {
    return this.#agreementAddress;
  };

  /**
   *
   * Get the type of this agreement (simple | countdown)
   *
   * @returns {string} type of the agreement
   */
  type = () => {
    return this.#type;
  };

  /**
   *
   * Get the address of the staker of this agreement
   *
   * @returns {address} address of the staker
   */
  staker = () => {
    return this.#staker;
  };

  /**
   * Get the address of the counterparty of this agreement
   *
   * @returns {address} address of the counterparty
   */
  counterparty = () => {
    return this.#counterparty;
  };

  /**
   * Called by staker to increase the stake
   *
   * @param {string} amount by which to increase the stake
   * @returns {Promise} transaction receipts
   */
  stake = async amount => {
    const operator = await Ethers.getAccount();
    if (Ethers.getAddress(operator) !== Ethers.getAddress(this.staker())) {
      throw new Error(`stake() can be called only by staker: ${this.staker()}`);
    }

    const tx = await this.contract().increaseStake(Ethers.parseEther(amount));
    return await tx.wait();
  };

  /**
   * Called by counterparty to increase the stake
   *
   * @param {string} amount amount by which to increase the stake (in NMR)
   * @returns {Promise} transaction receipt
   */
  reward = async amount => {
    const operator = await Ethers.getAccount();
    if (
      Ethers.getAddress(operator) !== Ethers.getAddress(this.counterparty())
    ) {
      throw new Error(
        `reward() can be called only by counterparty: ${this.counterparty()}`
      );
    }

    const tx = await this.contract().increaseStake(Ethers.parseEther(amount));
    return await tx.wait();
  };

  /**
   * Called by counterparty to burn some stake
   *
   * @param {string} amount - punishment amount to burn from the stake (in NMR)
   * @param {string} message - message to indicate reason for the punishment
   * @returns {Promise} amount it cost to punish
   * @returns {Promise} transaction receipts
   */
  punish = async (amount, message) => {
    const operator = await Ethers.getAccount();
    if (
      Ethers.getAddress(operator) !== Ethers.getAddress(this.counterparty())
    ) {
      throw new Error(
        `punish() can be called only by counterparty: ${this.counterparty()}`
      );
    }

    const tx = await this.contract().punish(
      Ethers.parseEther(amount),
      Buffer.from(message)
    );

    return await tx.wait();
  };

  /**
   * Called by counterparty to release the stake
   *
   * @param {string} amount amount to release from the stake (in NMR)
   * @returns {Promise} transaction receipt
   */
  release = async amount => {
    const tx = await this.contract().releaseStake(Ethers.parseEther(amount));
    return await tx.wait();
  };

  /**
   * Called by staker to start the countdown to withdraw the stake
   *
   * @returns {Promise} deadline timestamp when withdraw will be available
   * @returns {Promise} transaction receipts
   */
  requestWithdraw = async () => {
    const operator = await Ethers.getAccount();
    if (Ethers.getAddress(operator) !== Ethers.getAddress(this.staker())) {
      throw new Error(
        `requestWithdraw() can be called only by staker: ${this.staker()}`
      );
    }

    const tx = await this.contract().startCountdown();
    return await tx.wait();
  };

  /**
   * Called by staker to withdraw the stake
   *
   * @returns {Promise} amount withdrawn
   * @returns {Promise} transaction receipts
   */
  withdraw = async recipient => {
    if (this.type() !== "countdown") {
      throw new Error("'withdraw' is supported only for countdown agreement");
    }

    const tx = await this.contract().retrieveStake(recipient);
    return await tx.wait();
  };

  /**
   * Get the status of the agreement
   *
   * @returns {Promise} object with all relevant data
   */
  checkStatus = async () => {};
}

export default ErasureAgreement;
