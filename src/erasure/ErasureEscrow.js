import { ethers } from "ethers";
import { constants } from "@erasure/crypto-ipfs";

import Abi from "../utils/Abi";
import Box from "../utils/3Box";
import IPFS from "../utils/IPFS";
import Crypto from "../utils/Crypto";
import Ethers from "../utils/Ethers";
import Config from "../utils/Config";
import Contract from "../utils/Contract";
import ESP_1001 from "../utils/ESP_1001";

import Agreement_Factory from "../factory/Agreement_Factory";

const ESCROW_STATES = {
  IS_OPEN: 0, // initialized but no deposits made
  ONLY_STAKE_DEPOSITED: 1, // only stake deposit completed
  ONLY_PAYMENT_DEPOSITED: 2, // only payment deposit completed
  IS_DEPOSITED: 3, // both payment and stake deposit are completed
  IS_FINALIZED: 4, // the escrow completed successfully
  IS_CANCELLED: 5, // the escrow was cancelled
};

class ErasureEscrow {
  #token = null;
  #buyer = null;
  #seller = null;
  #tokenID = null;
  #contract = null;
  #stakeAmount = null;
  #paymentAmount = null;
  #erasureUsers = null;
  #escrowAddress = null;
  #creationReceipt = null;
  #encodedMetadata = null;
  #agreementFactory = null;

  /**
   * @constructor
   * @param {Object} config
   * @param {string} config.buyer
   * @param {string} config.seller
   * @param {string} config.stakeAmount
   * @param {string} config.paymentAmount
   * @param {string} config.escrowAddress
   * @param {Object} config.creationReceipt
   * @param {string} config.encodedMetadata
   */
  constructor({
    token,
    buyer,
    seller,
    tokenID,
    stakeAmount,
    paymentAmount,
    escrowAddress,
    erasureUsers,
    creationReceipt,
    encodedMetadata,
  }) {
    this.#token = token;
    this.#buyer = buyer;
    this.#seller = seller;
    this.#tokenID = tokenID;
    this.#stakeAmount = stakeAmount;
    this.#paymentAmount = paymentAmount;
    this.#escrowAddress = escrowAddress;

    this.#erasureUsers = erasureUsers;
    this.#creationReceipt = creationReceipt;
    this.#encodedMetadata = encodedMetadata;

    this.#agreementFactory = new Agreement_Factory({
      token: this.#token,
    });

    this.#contract = Contract.contract(
      "CountdownGriefingEscrow",
      escrowAddress,
    );
  }

  static get ESCROW_STATES() {
    return ESCROW_STATES;
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
   * Get the creationReceipt of this escrow
   *
   * @memberof ErasureEscrow
   * @method creationReceipt
   * @returns {Object}
   */
  creationReceipt = () => {
    return this.#creationReceipt;
  };

  /**
   * Get the creation timestamp of this escrow
   *
   * @memberof ErasureEscrow
   * @method getCreationTimestamp
   * @returns {integer}
   */
  getCreationTimestamp = async () => {
    const block = await Config.store.ethersProvider.getBlock(
      this.#creationReceipt.blockNumber,
    );
    return block.timestamp;
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
   * Get the tokenID
   *
   * @memberof ErasureEscrow
   * @method tokenID
   * @returns {integer} tokenID
   */
  tokenID = () => {
    return this.#tokenID;
  };

  /**
   * Get the metadata of this escrow
   *
   * @memberof ErasureEscrow
   * @method metadata
   * @returns {object} metadata
   */
  metadata = async () => {
    if (this.#encodedMetadata !== "0x") {
      return await ESP_1001.decodeMetadata(this.#encodedMetadata);
    } else {
      return this.#encodedMetadata;
    }
  };

  /**
   * Get the escrow status
   *
   * @memberof ErasureEscrow
   * @method getEscrowStatus
   * @returns {number} escrow status
   */
  getEscrowStatus = async () => {
    return await this.contract().getEscrowStatus();
  };

  /**
   * Get the agreement this escrow spawns
   *
   * @memberof ErasureEscrow
   * @method getAgreement
   * @returns {ErasureAgreement}
   */
  getAgreement = async () => {
    const logs = await Config.store.ethersProvider.getLogs({
      address: this.address(),
      topics: [ethers.utils.id("Finalized(address)")],
      fromBlock: 0,
    });
    const getdata = await this.getData();

    let agreementAddress;
    if (logs.length) {
      agreementAddress = Abi.decode(["address"], logs[0].data)[0];
    } else {
      const calldata = Abi.encodeWithSelector(
        "initialize",
        [
          "address",
          "address",
          "address",
          "uint8",
          "uint256",
          "uint8",
          "uint256",
          "bytes",
        ],
        [
          this.address(),
          getdata.buyer,
          getdata.seller,
          getdata.tokenID,
          getdata.ratio,
          getdata.ratioType,
          getdata.agreementLength,
          "0x",
        ],
      );

      agreementAddress = await this.#agreementFactory
        .contract()
        .getNextNonceInstance(this.address(), calldata);
    }

    return await this.#agreementFactory.createClone({
      address: agreementAddress,
      type: "countdown",
      tokenID: getdata.tokenID,
      staker: getdata.seller,
      griefRatio: getdata.ratio,
      counterparty: getdata.buyer,
      creationReceipt: null,
      encodedMetadata: "0x",
    });
  };

  /**
   * Get the state data of the escrow
   *
   * @memberof ErasureEscrow
   * @method getData
   * @returns {Promise} object with all relevant data
   */
  getData = async () => {
    const operator = await this.contract().getOperator();
    const seller = await this.contract().getSeller();
    const buyer = await this.contract().getBuyer();
    const {
      tokenID,
      paymentAmount,
      stakeAmount,
      ratio,
      ratioType,
      countdownLength,
    } = await this.contract().getData();
    const escrowLength = await this.contract().getLength();
    const escrowDeadline = await this.contract().getDeadline();
    const escrowStatus = await this.contract().getEscrowStatus();
    const countdownStatus = await this.contract().getCountdownStatus();
    const metadata = await this.metadata();

    let datasold;
    if (escrowStatus === 4) {
      const logs = await Config.store.ethersProvider.getLogs({
        address: this.address(),
        topics: [ethers.utils.id("DataSubmitted(bytes)")],
        fromBlock: 0,
      });
      datasold = JSON.parse(
        ethers.utils.toUtf8String(Abi.decode(["bytes"], logs[0].data)[0]),
      );
    }

    return {
      tokenID,
      paymentAmount: ethers.utils.formatEther(paymentAmount),
      stakeAmount: ethers.utils.formatEther(stakeAmount),
      ratio: ethers.utils.formatEther(ratio).toString(),
      ratioType,
      agreementLength: countdownLength,
      escrowLength,
      escrowDeadline,
      escrowStatus,
      countdownStatus,
      seller,
      buyer,
      operator,
      metadata,
      datasold,
    };
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
  depositStake = async (proofhash, extraData) => {
    const user = await Ethers.getAccount(Config.store.ethersProvider);

    const stakeAmount = Ethers.parseEther(this.#stakeAmount);
    await this.#token.approve(this.tokenID(), this.address(), stakeAmount);

    let tx;
    if (Ethers.getAddress(this.seller()) === ethers.constants.AddressZero) {
      tx = await this.contract().depositAndSetSeller(user);
    } else if (Ethers.getAddress(user) !== Ethers.getAddress(this.seller())) {
      throw new Error(
        `depositStake() can only be called by the seller: ${this.seller()}`,
      );
    } else {
      tx = await this.contract().depositStake();
    }

    const receipt = await tx.wait();
    this.#seller = user;

    // If the payment is already deposited, also send the encrypted symkey
    let agreementAddress = null;
    const isFinalized =
      (await this.getEscrowStatus()) ===
      ErasureEscrow.ESCROW_STATES.IS_FINALIZED;
    if (isFinalized) {
      ({ agreementAddress } = await this.finalize(
        proofhash,
        extraData,
        true /* finalized */,
      ));
    }

    return {
      receipt,
      ...(agreementAddress ? { agreementAddress } : {}),
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
    const user = await Ethers.getAccount(Config.store.ethersProvider);
    if (Ethers.getAddress(user) !== Ethers.getAddress(this.buyer())) {
      throw new Error(
        `depositPayment() can only be called by the buyer: ${this.buyer()}`,
      );
    }

    const paymentAmount = Ethers.parseEther(this.#paymentAmount);
    console.log("escrow_address", this.address());
    await this.#token.approve(this.tokenID(), this.address(), paymentAmount);

    const tx = await this.contract().depositPayment();
    return await tx.wait();
  };

  /**
   * Called by seller to finalize and submit the encrypted symkey
   *
   * @memberof ErasureEscrow
   * @method finalize
   * @param proofhash proofhash of the data to sell
   * @param extraData additional data to submit to the contract
   * @param finalized true if finalize function already called and only submitting data
   * @returns {Promise} address of the agreement
   * @returns {Promise} transaction receipts
   */
  finalize = async (proofhash, extraData, finalized = false) => {
    const keypair = await Box.getKeyPair(Config.store.web3Provider);
    if (keypair === null) {
      throw new Error("Cannot find the keypair of this user!");
    }

    if (typeof proofhash === "object") {
      proofhash = proofhash.proofhash;
    }

    const symKey = await Box.getSymKey(proofhash, Config.store.web3Provider);
    const publicKey = await this.#erasureUsers.getUserData(this.buyer());
    const buyerKeypair = {
      key: {
        publicKey: Uint8Array.from(Buffer.from(publicKey.substr(2), "hex")),
        secretKey: keypair.key.secretKey,
      },
    };
    ``;
    // Encrypt the symKey
    const nonce = Crypto.asymmetric.genNonce();
    const encryptedSymKey = Crypto.asymmetric.encrypt(
      symKey,
      nonce,
      buyerKeypair,
    );

    // Finalize.
    let receipt;
    if (!finalized) {
      const tx = await this.contract().finalize();
      receipt = await tx.wait();
    }

    // get the agreement address.
    const results = await Config.store.ethersProvider.getLogs({
      address: this.address(),
      topics: [ethers.utils.id("Finalized(address)")],
      fromBlock: 0,
    });
    const agreementAddress = Abi.decode(
      ["address"],
      results[results.length - 1].data,
    )[0];

    // Submit the encrypted SymKey
    const tx = await this.contract().submitData(
      Buffer.from(
        JSON.stringify({
          proofhash,
          ...extraData,
          nonce: nonce.toString(),
          encryptedSymKey: encryptedSymKey.toString(),
        }),
      ),
    );
    await tx.wait();

    return {
      receipt,
      agreementAddress,
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
    if (
      (await this.getEscrowStatus()) ===
      ErasureEscrow.ESCROW_STATES.IS_DEPOSITED
    ) {
      const tx = await this.contract().timeout();
      return await tx.wait();
    } else {
      const tx = await this.contract().cancel();
      return await tx.wait();
    }
  };
}

export default ErasureEscrow;
