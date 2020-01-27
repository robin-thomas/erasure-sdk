import { ethers } from "ethers";

import ErasureEscrow from "./ErasureEscrow";

import Box from "../utils/3Box";
import IPFS from "../utils/IPFS";
import Utils from "../utils/Utils";
import Crypto from "../utils/Crypto";
import Ethers from "../utils/Ethers";

class ErasurePost {
  #owner = null;
  #proofhash = null;
  #feedAddress = null;
  #escrowFactory = null;
  #web3Provider = null;
  #ethersProvider = null;
  #protocolVersion = "";

  /**
   * @constructor
   * @param {Object} config
   * @param {address} config.owner
   * @param {string} config.proofhash
   * @param {address} config.feedAddress
   * @param {Object} config.web3Provider
   * @param {string} config.protocolVersion
   */
  constructor({
    owner,
    proofhash,
    feedAddress,
    escrowFactory,
    web3Provider,
    ethersProvider,
    protocolVersion
  }) {
    this.#owner = owner;
    this.#proofhash = proofhash;
    this.#feedAddress = feedAddress;
    this.#escrowFactory = escrowFactory;
    this.#web3Provider = web3Provider;
    this.#ethersProvider = ethersProvider;
    this.#protocolVersion = protocolVersion;
  }

  /**
   * Get the proofhash of this post
   *
   * @memberof ErasurePost
   * @method proofhash
   * @returns {string} bytes32 sha256 proofhash
   * @returns {string} base58 multihash format of the proofhash
   */
  proofhash = () => {
    return {
      proofhash: this.#proofhash,
      multihash: Utils.sha256ToHash(this.#proofhash)
    };
  };

  /**
   *
   * Get the address of the owner of this post
   *
   * @memberof ErasurePost
   * @method owner
   * @returns {Promise} address of the owner
   */
  owner = () => {
    return this.#owner;
  };

  #metadata = async () => {
    const staticMetadataB58 = Utils.sha256ToHash(this.proofhash().proofhash);
    const metadata = await IPFS.get(staticMetadataB58);
    return JSON.parse(metadata);
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
    agreementCountdown
  }) => {
    const operator = await Ethers.getAccount(this.#ethersProvider);
    if (Ethers.getAddress(operator) !== Ethers.getAddress(this.owner())) {
      throw new Error(
        `offerSell() can only be called by the owner: ${this.owner()}`
      );
    }

    return await this.#escrowFactory.create({
      operator,
      ...(buyer !== undefined && buyer !== null
        ? { buyer }
        : { buyer: operator }),
      seller: this.owner(),
      paymentAmount,
      stakeAmount,
      escrowCountdown,
      griefRatio,
      griefRatioType,
      agreementCountdown,
      metadata: JSON.stringify({ proofhash: this.proofhash().proofhash })
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
    const results = await this.#ethersProvider.getLogs({
      address: this.#escrowFactory.address(),
      fromBlock: 0,
      topics: [ethers.utils.id("InstanceCreated(address,address,bytes)")]
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
            tokenId,
            paymentAmount,
            stakeAmount,
            staticMetadataB58
          } = this.#escrowFactory.decodeParams(result.data);

          let metadata = await IPFS.get(staticMetadataB58);
          metadata = JSON.parse(metadata);

          if (
            metadata.proofhash !== undefined &&
            metadata.proofhash === this.proofhash().proofhash
          ) {
            escrows.push(
              this.#escrowFactory.createClone({
                buyer,
                seller,
                tokenId,
                stakeAmount,
                paymentAmount,
                escrowAddress,
                proofhash: metadata.proofhash
              })
            );
          }
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
    agreementCountdown
  }) => {
    const buyer = await Ethers.getAccount(this.#ethersProvider);
    const seller = this.owner();

    return await this.#escrowFactory.create({
      operator: buyer,
      buyer,
      seller,
      paymentAmount,
      stakeAmount,
      escrowCountdown,
      griefRatio,
      griefRatioType,
      agreementCountdown,
      metadata: JSON.stringify({ proofhash: this.proofhash().proofhash })
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
    const results = await this.#ethersProvider.getLogs({
      address: this.#escrowFactory.address(),
      fromBlock: 0,
      topics: [ethers.utils.id("InstanceCreated(address,address,bytes)")]
    });

    let escrows = [];
    if (results && results.length > 0) {
      for (const result of results) {
        const escrowAddress = Ethers.getAddress(result.topics[1]);
        const {
          buyer,
          seller,
          tokenId,
          paymentAmount,
          stakeAmount,
          staticMetadataB58
        } = this.#escrowFactory.decodeParams(result.data);

        if (seller === this.owner()) {
          let metadata = await IPFS.get(staticMetadataB58);
          metadata = JSON.parse(metadata);

          if (
            metadata.proofhash !== undefined &&
            metadata.proofhash === this.proofhash().proofhash
          ) {
            escrows.push(
              this.#escrowFactory.createClone({
                buyer,
                seller,
                tokenId,
                stakeAmount,
                paymentAmount,
                escrowAddress,
                proofhash: metadata.proofhash
              })
            );
          }
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
      const keypair = await Box.getKeyPair(this.#web3Provider);
      if (keypair === null) {
        throw new Error("Unable to retrieve the keypair");
      }

      const { keyhash, encryptedDatahash } = await this.#metadata();
      const symKey = await Box.getSymKey(keyhash, this.#web3Provider);

      // Download the encryptedPost from ipfs
      const encryptedPost = await IPFS.get(encryptedDatahash);

      // Upload the decrypted ost data to ipfs.
      const post = Crypto.symmetric.decrypt(symKey, encryptedPost);
      await IPFS.add(post);

      // Upload the symKey & return the ipfshash.
      return await IPFS.add(symKey);
    } catch (err) {
      throw err;
    }
  };

  isRevealed = async () => {
    try {
      const { keyhash } = await this.#metadata();
      const symkey = await IPFS.get(keyhash);

      return symkey !== undefined;
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
      revealed
    };
  };
}

export default ErasurePost;
