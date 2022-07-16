import { ethers } from "ethers";

import ErasureEscrow from "./ErasureEscrow";

import Box from "../utils/3Box";
import IPFS from "../utils/IPFS";
import Utils from "../utils/Utils";
import Crypto from "../utils/Crypto";
import Ethers from "../utils/Ethers";
import Config from "../utils/Config";

class ErasurePost {
  #owner = null;
  #proofhash = null;
  #feedAddress = null;
  #escrowFactory = null;
  #creationReceipt = null;

  /**
   * @constructor
   * @param {Object} config
   * @param {address} config.owner
   * @param {string} config.proofhash
   * @param {address} config.feedAddress
   * @param {Object} config.creationReceipt
   */
  constructor({
    owner,
    proofhash,
    feedAddress,
    escrowFactory,
    creationReceipt,
  }) {
    this.#owner = owner;
    this.#proofhash = proofhash;
    this.#feedAddress = feedAddress;
    this.#escrowFactory = escrowFactory;
    this.#creationReceipt = creationReceipt;
  }

  /**
   * Get the proofhash of this post
   *
   * @memberof ErasurePost
   * @method proofhash
   * @returns {string} bytes32 sha256 proofhash
   * @returns {string} base58 multihash format of the proofhash
   * @returns {Promise<Object>} proof containing content of post
   */
  proofhash = () => {
    return {
      proofhash: this.#proofhash,
      multihash: Utils.sha256ToHash(this.#proofhash),
      parseProof: () => {
        return this.parseProof(this.#proofhash);
      },
    };
  };

  parseProof = async proofhash => {
    let proofBlob;
    try {
      proofBlob = await IPFS.get(Utils.sha256ToHash(proofhash));
    } catch (error) {
      console.log("Failed to fetch proofhash from ipfs");
      throw new Error(error);
    }
    const proof = JSON.parse(proofBlob);

    let fetch = {};
    for (const [key, value] of Object.entries(proof)) {
      if (key === "creator") {
        continue;
      }
      fetch[key] = {};
      try {
        fetch[key].blob = await IPFS.get(value);
      } catch (error) {
        fetch[key].error = error;
      }
      if (fetch[key].error !== undefined || fetch[key].blob === undefined) {
        fetch[key].content = undefined;
      } else {
        fetch[key].content = fetch[key].blob;
      }
    }

    if (
      fetch.datahash.content === null &&
      fetch.keyhash.content &&
      fetch.encryptedDatahash.content
    ) {
      await IPFS.add(encryptedPost);
      // Upload the decrypted post data to ipfs.
      fetch.datahash.content = await Crypto.symmetric.decrypt(
        fetch.keyhash.content,
        fetch.encryptedDatahash.content,
      );
      await IPFS.add(fetch.datahash.content);
    }

    return {
      submitter: this.#owner,
      creator: proof.creator,
      datahash: proof.datahash,
      keyhash: proof.keyhash,
      encryptedDatahash: proof.encryptedDatahash,
      timestamp: await this.getCreationTimestamp(),
      data: fetch.datahash.content,
      key: fetch.keyhash.content,
      encryptedData: fetch.encryptedDatahash.content,
      isValid: this.#owner === proof.creator,
      isRevealed: fetch.datahash.content !== undefined,
    };
  };

  /**
   *
   * Get the address of the owner of this post
   *
   * @memberof ErasurePost
   * @method owner
   * @returns {string} address of the owner
   */
  owner = () => {
    return this.#owner;
  };

  /**
   *
   * Get the address of the feed of this post
   *
   * @memberof ErasurePost
   * @method feedAddress
   * @returns {string} address of the feed
   */
  feedAddress = () => {
    return this.#feedAddress;
  };

  /**
   * Get the creationReceipt of this post
   *
   * @memberof ErasurePost
   * @method creationReceipt
   * @returns {Object}
   */
  creationReceipt = () => {
    return this.#creationReceipt;
  };

  /**
   * Get the creation timestamp of this post
   *
   * @memberof ErasurePost
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
   * Create a new CountdownGriefingEscrow and deposit stake
   * - only called by owner of post
   * - add proofhash to metadata
   * - add Post owner as staker
   *
   * @memberof ErasurePost
   * @method offerSell
   * @param {Object} config - configuration for escrow
   * @param {string} [config.buyer]
   * @param {string} config.paymentAmount
   * @param {string} config.stakeAmount
   * @param {number} config.escrowCountdown
   * @param {string} config.griefRatio
   * @param {number} config.griefRatioType
   * @param {number} config.agreementCountdown
   * @param {Object} [config.metadata]
   * @returns {Promise} address of the escrow
   * @returns {Promise} address of the agreement
   * @returns {Promise} transaction receipts
   */
  offerSell = async ({
    buyer,
    paymentAmount,
    stakeAmount,
    escrowCountdown,
    griefRatio,
    griefRatioType,
    agreementCountdown,
    metadata,
  }) => {
    const user = await Ethers.getAccount(Config.store.ethersProvider);
    if (Ethers.getAddress(user) !== Ethers.getAddress(this.owner())) {
      throw new Error(
        `offerSell() can only be called by the owner: ${this.owner()}`,
      );
    }

    return await this.#escrowFactory.create({
      user,
      ...(buyer !== undefined && buyer !== null
        ? { buyer }
        : { buyer: user }),
      seller: this.owner(),
      paymentAmount,
      stakeAmount,
      escrowCountdown,
      griefRatio,
      griefRatioType,
      agreementCountdown,
      metadata,
    });
  };

  /**
   * Get all escrows to sell this Post
   *
   * @memberof ErasurePost
   * @method getSellOffers
   * @returns {Promise} array of Escrow objects
   */
  getSellOffers = async () => {
    const results = await Config.store.ethersProvider.getLogs({
      address: this.#escrowFactory.address(),
      fromBlock: 0,
      topics: [ethers.utils.id("InstanceCreated(address,address,bytes)")],
    });

    let escrows = [];
    if (results && results.length > 0) {
      for (const result of results) {
        const creator = Ethers.getAddress(result.topics[2]);
        const escrowAddress = Ethers.getAddress(result.topics[1]);

        if (creator === this.owner()) {
          const {
            buyer,
            seller,
            tokenID,
            paymentAmount,
            stakeAmount,
            encodedMetadata,
          } = this.#escrowFactory.decodeParams(result.data);

          escrows.push(
            this.#escrowFactory.createClone({
              buyer,
              seller,
              tokenID,
              stakeAmount,
              paymentAmount,
              escrowAddress,
              encodedMetadata,
            }),
          );
        }
      }
    }

    return escrows;
  };

  /**
   * Create a new CountdownGriefingEscrow and deposit payment
   * - add proofhash to metadata
   * - add Post owner as staker
   * - add caller as buyer
   *
   * @memberof ErasurePost
   * @method offerBuy
   * @param {Object} config - configuration for escrow
   * @param {string} config.paymentAmount
   * @param {string} config.stakeAmount
   * @param {number} config.escrowCountdown
   * @param {string} config.ratio
   * @param {number} config.ratioType
   * @param {number} config.agreementCountdown
   * @param {Object} [config.metadata]
   * @returns {Promise} address of the escrow
   * @returns {Promise} address of the agreement
   * @returns {Promise} transaction receipts
   */
  offerBuy = async ({
    paymentAmount,
    stakeAmount,
    escrowCountdown,
    griefRatio,
    griefRatioType,
    agreementCountdown,
    metadata,
  }) => {
    const buyer = await Ethers.getAccount(Config.store.ethersProvider);
    const seller = this.owner();

    return await this.#escrowFactory.create({
      buyer,
      seller,
      paymentAmount,
      stakeAmount,
      escrowCountdown,
      griefRatio,
      griefRatioType,
      agreementCountdown,
      metadata,
    });
  };

  /**
   * Get all escrows to buy this Post
   *
   * @memberof ErasurePost
   * @method getBuyOffers
   * @returns {Promise} array of Escrow objects
   */
  getBuyOffers = async () => {
    const results = await Config.store.ethersProvider.getLogs({
      address: this.#escrowFactory.address(),
      fromBlock: 0,
      topics: [ethers.utils.id("InstanceCreated(address,address,bytes)")],
    });

    let escrows = [];
    if (results && results.length > 0) {
      for (const result of results) {
        const escrowAddress = Ethers.getAddress(result.topics[1]);
        const {
          buyer,
          seller,
          tokenID,
          paymentAmount,
          stakeAmount,
          encodedMetadata,
        } = this.#escrowFactory.decodeParams(result.data);

        if (seller === this.owner()) {
          escrows.push(
            this.#escrowFactory.createClone({
              buyer,
              seller,
              tokenID,
              stakeAmount,
              paymentAmount,
              escrowAddress,
              encodedMetadata,
            }),
          );
        }
      }
    }

    return escrows;
  };

  /**
   * Reveal this post publicly
   * - fetch symkey and upload to ipfs
   * - should be called by feed creator
   *
   * @memberof ErasurePost
   * @method reveal
   * @returns {Promise} base58 multihash format of the ipfs address of the revealed key
   */
  reveal = async () => {
    try {
      const keypair = await Box.getKeyPair(Config.store.web3Provider);
      if (keypair === null) {
        throw new Error("Unable to retrieve the keypair");
      }

      const proof = await this.parseProof(this.#proofhash);
      const symKey = await Box.getSymKey(
        proof.keyhash,
        Config.store.web3Provider,
      );

      // Download the encryptedPost from ipfs
      const encryptedPost = await IPFS.get(proof.encryptedDatahash);

      // Upload the decrypted ost data to ipfs.
      const post = Crypto.symmetric.decrypt(symKey, encryptedPost);
      await IPFS.add(post);

      // Upload the symKey & return the ipfshash.
      return await IPFS.add(symKey);
    } catch (err) {
      throw err;
    }
  };

  /**
   * Check if the post is publically revealed
   *
   * @memberof ErasurePost
   * @method isRevealed
   * @returns {Promise} bool true if revealed
   */
  isRevealed = async () => {
    try {
      const proof = await this.parseProof(this.#proofhash);
      return proof.isRevealed;
    } catch (err) {
      return false;
    }
  };

  /**
   *
   * Get the status of the post
   *
   * @memberof ErasurePost
   * @method checkStatus
   * @returns {Promise} result
   * @returns {boolean} result.revealed - bool true if the post is revealed
   * @returns {integer} result.numSold - number of times the post was sold
   */
  checkStatus = async () => {
    let escrows = [];
    escrows.push(...(await this.getBuyOffers()));
    escrows.push(...(await this.getSellOffers()));

    let numSold = 0;
    for (const escrow of escrows) {
      // Check the number of finalized escrows.
      numSold +=
        (await escrow.getEscrowStatus()) ===
        ErasureEscrow.ESCROW_STATES.IS_FINALIZED
          ? 1
          : 0;
    }

    const revealed = await this.isRevealed();

    return {
      numSold,
      revealed,
    };
  };
}

export default ErasurePost;
