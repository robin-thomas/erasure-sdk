import { ethers } from "ethers";

import Box from "../utils/3Box";
import IPFS from "../utils/IPFS";
import Crypto from "../utils/Crypto";
import Ethers from "../utils/Ethers";

import contract from "../../artifacts/CountdownGriefingEscrow.json";

class ErasureEscrow {
  #nmr = null;
  #buyer = null;
  #seller = null;
  #contract = null;
  #stakeAmount = null;
  #paymentAmount = null;
  #escrowAddress = null;
  #protocolVersion = "";

  /**
   * @constructor
   * @param {Object} config
   * @param {string} config.protocolVersion
   * @param {string} config.escrowAddress
   */
  constructor({
    nmr,
    buyer,
    seller,
    stakeAmount,
    paymentAmount,
    escrowAddress,
    protocolVersion
  }) {
    this.#nmr = nmr;
    this.#buyer = buyer;
    this.#seller = seller;
    this.#stakeAmount = Ethers.parseEther(stakeAmount);
    this.#paymentAmount = Ethers.parseEther(paymentAmount);
    this.#escrowAddress = escrowAddress;
    this.#protocolVersion = protocolVersion;

    this.#contract = new ethers.Contract(
      escrowAddress,
      contract.abi,
      Ethers.getWallet()
    );

    // Listen for any metamask changes.
    if (typeof window !== "undefined" && window.ethereum !== undefined) {
      window.ethereum.on("accountsChanged", function() {
        this.#contract = new ethers.Contract(
          escrowAddress,
          contract.abi,
          Ethers.getWallet()
        );
      });
    }
  }

  /**
   * Access the web3 contract class
   */
  contract = () => {
    return this.#contract;
  };

  /**
   * Get the address of this escrow
   *
   * @returns {address} address of the escrow
   */
  address = () => {
    return this.#escrowAddress;
  };

  /**
   * Get the address of the seller of this escrow
   *
   * @returns {address} address of the seller
   */
  seller = () => {
    return this.#seller;
  };

  /**
   * Get the address of the buyer of this escrow
   *
   * @returns {address} address of the buyer
   */
  buyer = () => {
    return this.#buyer;
  };

  /**
   * Called by seller to deposit the stake
   * - If the payment is already deposited, also send the encrypted symkey
   *
   * @returns {Promise} address of the agreement
   * @returns {Promise} transaction receipts
   */
  depositStake = async () => {
    const operator = await Ethers.getAccount();
    if (Ethers.getAddress(operator) !== Ethers.getAddress(this.seller())) {
      throw new Error(
        `depositStake() can only be called by the seller: ${this.seller()}`
      );
    }

    if (process.env.NODE_ENV === "test") {
      await this.#nmr.mintMockTokens(operator, this.#stakeAmount);
    } else {
      const network = await Ethers.getProvider().getNetwork();
      if (network && network.name === "rinkeby") {
        await this.#nmr.mintMockTokens(operator, this.#stakeAmount);
      }
    }

    await this.#nmr.approve(this.address(), this.#stakeAmount);

    const tx = await this.contract().depositStake();
    return await tx.wait();
  };

  /**
   * Called by buyer to deposit the payment
   *
   * @returns {Promise} transaction receipts
   */
  depositPayment = async () => {
    const operator = await Ethers.getAccount();
    if (Ethers.getAddress(operator) !== Ethers.getAddress(this.buyer())) {
      throw new Error(
        `depositPayment() can only be called by the seller: ${this.buyer()}`
      );
    }

    if (process.env.NODE_ENV === "test") {
      await this.#nmr.mintMockTokens(operator, this.#paymentAmount);
    } else {
      const network = await Ethers.getProvider().getNetwork();
      if (network && network.name === "rinkeby") {
        await this.#nmr.mintMockTokens(operator, this.#paymentAmount);
      }
    }

    await this.#nmr.approve(this.address(), this.#paymentAmount);

    const tx = await this.contract().depositPayment();
    return await tx.wait();
  };

  /**
   * Called by seller to finalize and submit the encrypted symkey
   *
   * @returns {Promise} address of the agreement
   * @returns {Promise} transaction receipts
   */
  finalize = async () => {
    const tx = await this.contract().finalize();
    return await tx.wait();
  };

  /**
   * Called by seller or buyer to attempt to cancel the escrow
   *
   * @returns {Promise} bool true if the cancel succeeded
   * @returns {Promise} transaction receipts
   */
  cancel = async () => {
    const tx = await this.contract().cancel();
    return await tx.wait();
  };

  /**
   * Get the status of the escrow
   *
   * @returns {Promise} object with all relevant data
   */
  checkStatus() {}
}

export default ErasureEscrow;
