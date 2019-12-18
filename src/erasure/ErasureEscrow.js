import { ethers } from "ethers";

import Abi from "../utils/Abi";
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
  #proofhash = null;
  #stakeAmount = null;
  #paymentAmount = null;
  #erasureUsers = null;
  #escrowAddress = null;
  #web3Provider = null;
  #protocolVersion = "";

  /**
   * @constructor
   * @param {Object} config
   * @param {string} config.buyer
   * @param {string} config.seller
   * @param {string} config.proofhash
   * @param {string} config.stakeAmount
   * @param {string} config.paymentAmount
   * @param {string} config.escrowAddress
   * @param {Object} config.web3Provider
   * @param {string} config.protocolVersion
   */
  constructor({
    nmr,
    buyer,
    seller,
    proofhash,
    stakeAmount,
    paymentAmount,
    escrowAddress,
    erasureUsers,
    web3Provider,
    protocolVersion
  }) {
    this.#nmr = nmr;
    this.#buyer = buyer;
    this.#seller = seller;
    this.#proofhash = proofhash;
    this.#stakeAmount = Ethers.parseEther(stakeAmount);
    this.#paymentAmount = Ethers.parseEther(paymentAmount);
    this.#escrowAddress = escrowAddress;

    this.#erasureUsers = erasureUsers;
    this.#web3Provider = web3Provider;
    this.#protocolVersion = protocolVersion;

    this.#contract = new ethers.Contract(
      escrowAddress,
      contract.abi,
      Ethers.getWallet(this.#web3Provider)
    );

    // Listen for any metamask changes.
    if (typeof window !== "undefined" && window.ethereum !== undefined) {
      window.ethereum.on("accountsChanged", function() {
        this.#contract = new ethers.Contract(
          escrowAddress,
          contract.abi,
          Ethers.getWallet(this.#web3Provider)
        );
      });
    }
  }

  /**
   * Access the web3 contract class
   *
   * @memberof ErasureEscrow
   * @method contract
   * @returns {Object} contract object
   */
  contract = () => {
    return this.#contract;
  };

  /**
   * Get the address of this escrow
   *
   * @memberof ErasureEscrow
   * @method address
   * @returns {address} address of the escrow
   */
  address = () => {
    return this.#escrowAddress;
  };

  /**
   * Get the address of the seller of this escrow
   *
   * @memberof ErasureEscrow
   * @method seller
   * @returns {address} address of the seller
   */
  seller = () => {
    return this.#seller;
  };

  /**
   * Get the address of the buyer of this escrow
   *
   * @memberof ErasureEscrow
   * @method buyer
   * @returns {address} address of the buyer
   */
  buyer = () => {
    return this.#buyer;
  };

  /**
   * Called by seller to deposit the stake
   * - If the payment is already deposited, also send the encrypted symkey
   *
   * @memberof ErasureEscrow
   * @method depositStake
   * @returns {Promise} address of the agreement
   * @returns {Promise} transaction receipt
   */
  depositStake = async () => {
    const operator = await Ethers.getAccount(this.#web3Provider);
    if (Ethers.getAddress(operator) !== Ethers.getAddress(this.seller())) {
      throw new Error(
        `depositStake() can only be called by the seller: ${this.seller()}`
      );
    }

    if (process.env.NODE_ENV === "test") {
      await this.#nmr.mintMockTokens(operator, this.#stakeAmount);
    } else {
      const network = await this.#web3Provider.getNetwork();
      if (network && network.name === "rinkeby") {
        await this.#nmr.mintMockTokens(operator, this.#stakeAmount);
      }
    }

    await this.#nmr.approve(this.address(), this.#stakeAmount);

    const tx = await this.contract().depositStake();
    const receipt = await tx.wait();

    // If the payment is already deposited, also send the encrypted symkey
    let agreementAddress = null;
    const isDeposited = (await this.contract().getEscrowStatus()) === 4;
    if (isDeposited) {
      ({ agreementAddress } = await this.finalize(true /* finalized */));
    }

    return {
      receipt,
      ...(agreementAddress ? { agreementAddress } : {})
    };
  };

  /**
   * Called by buyer to deposit the payment
   *
   * @memberof ErasureEscrow
   * @method depositPayment
   * @returns {Promise} transaction receipt
   */
  depositPayment = async () => {
    const operator = await Ethers.getAccount(this.#web3Provider);
    if (Ethers.getAddress(operator) !== Ethers.getAddress(this.buyer())) {
      throw new Error(
        `depositPayment() can only be called by the seller: ${this.buyer()}`
      );
    }

    if (process.env.NODE_ENV === "test") {
      await this.#nmr.mintMockTokens(operator, this.#paymentAmount);
    } else {
      const network = await this.#web3Provider.getNetwork();
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
   * @memberof ErasureEscrow
   * @method finalize
   * @returns {Promise} address of the agreement
   * @returns {Promise} transaction receipts
   */
  finalize = async (finalized = false) => {
    const keypair = await Box.getKeyPair();
    if (keypair === null) {
      throw new Error("Cannot find the keypair of this user!");
    }

    const symKey = await Box.getSymKey(this.#proofhash);
    const publicKey = await this.#erasureUsers.getUserData(this.buyer());
    const buyerKeypair = {
      key: {
        publicKey: Uint8Array.from(Buffer.from(publicKey.substr(2), "hex")),
        secretKey: keypair.key.secretKey
      }
    };

    // Encrypt the symKey
    const nonce = Crypto.asymmetric.genNonce();
    const encryptedSymKey = Crypto.asymmetric.encrypt(
      symKey,
      nonce,
      buyerKeypair
    );

    // Finalize.
    let receipt;
    if (!finalized) {
      const tx = await this.contract().finalize();
      receipt = await tx.wait();
    }

    // get the agreement address.
    const results = await this.#web3Provider.getLogs({
      address: this.address(),
      topics: [ethers.utils.id("Finalized(address)")],
      fromBlock: 0
    });
    const agreementAddress = Abi.decode(
      ["address"],
      results[results.length - 1].data
    )[0];

    // Submit the encrypted SymKey
    const tx = await this.contract().submitData(
      Buffer.from(
        JSON.stringify({
          nonce: nonce.toString(),
          encryptedSymKey: encryptedSymKey.toString()
        })
      )
    );
    await tx.wait();

    return {
      receipt,
      agreementAddress
    };
  };

  /**
   * Called by seller or buyer to attempt to cancel the escrow
   *
   * @memberof ErasureEscrow
   * @method cancel
   * @returns {Promise} transaction receipt
   */
  cancel = async () => {
    const tx = await this.contract().cancel();
    return await tx.wait();
  };
}

export default ErasureEscrow;
