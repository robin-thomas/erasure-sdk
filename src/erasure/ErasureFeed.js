import { ethers } from "ethers";

import ErasurePost from "./ErasurePost";
import Escrow_Factory from "../factory/Escrow_Factory";

import Box from "../utils/3Box";
import IPFS from "../utils/IPFS";
import Crypto from "../utils/Crypto";
import Ethers from "../utils/Ethers";

import contract from "../../artifacts/Feed.json";

const crypto = async post => {
  const keypair = await Box.getKeyPair();
  if (keypair === null) {
    throw new Error("Cannot find the keypair of this user!");
  }

  const symmetricKey = Crypto.symmetric.genKey();
  const encryptedPost = Crypto.symmetric.encrypt(symmetricKey, post);
  const encryptedPostIpfsHash = await IPFS.add(encryptedPost);

  // Nonce is set per post.
  const nonce = Crypto.asymmetric.genNonce();
  const encryptedSymmetricKey = Crypto.asymmetric.encrypt(
    symmetricKey,
    nonce,
    keypair
  );

  return {
    nonce: nonce.toString(),
    encryptedSymmetricKey: encryptedSymmetricKey.toString(),
    encryptedPostIpfsHash
  };
};

class ErasureFeed {
  #owner = null;
  #numSold = 0;
  #revealed = false;
  #contract = null;
  #feedAddress = null;
  #escrowFactory = null;
  #protocolVersion = "";

  /**
   * @constructor
   * @param {Object} config
   * @param {string} config.owner
   * @param {string} config.feedAddress
   * @param {string} config.protocolVersion
   */
  constructor({ owner, feedAddress, protocolVersion, escrowFactory }) {
    this.#owner = owner;
    this.#feedAddress = feedAddress;
    this.#escrowFactory = escrowFactory;
    this.#protocolVersion = protocolVersion;

    this.#contract = new ethers.Contract(
      feedAddress,
      contract.abi,
      Ethers.getWallet()
    );

    // Listen for any metamask changes.
    if (typeof window !== "undefined" && window.ethereum !== undefined) {
      window.ethereum.on("accountsChanged", function() {
        this.#contract = new ethers.Contract(
          feedAddress,
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
   * Get the address of this feed
   *
   * @returns {address} address of the feed
   */
  address = () => {
    return this.#feedAddress;
  };

  /**
   * Get the address of the owner of this feed
   *
   * @returns {address} address of the owner
   */
  owner = () => {
    return this.#owner;
  };

  /**
   * Submit new data to this feed
   * - can only called by feed owner
   *
   * @param {string} data - raw data to be posted
   * @returns {Promise<PostWithReceipt>}
   */
  createPost = async (data, proofhash = null) => {
    try {
      const operator = await Ethers.getAccount();
      if (Ethers.getAddress(operator) !== Ethers.getAddress(this.owner())) {
        throw new Error(
          `createPost() can only be called by the owner: ${this.owner()}`
        );
      }

      // Get the IPFS hash of the post without uploading it to IPFS.
      const ipfsHash = await IPFS.getHash(data);

      if (proofhash === null) {
        const metadata = await crypto(data);
        const staticMetadataB58 = await IPFS.add(
          JSON.stringify({
            ...metadata,
            ipfsHash
          })
        );
        proofhash = IPFS.hashToSha256(staticMetadataB58);
      }

      const tx = await this.contract().submitHash(proofhash);
      const receipt = await tx.wait();

      return {
        receipt,
        post: new ErasurePost({
          proofhash,
          owner: this.owner(),
          feedAddress: this.address(),
          escrowFactory: this.#escrowFactory,
          protocolVersion: this.#protocolVersion
        })
      };
    } catch (err) {
      throw err;
    }
  };

  createClone = async proofhash => {
    return new ErasurePost({
      proofhash,
      owner: this.owner(),
      feedAddress: this.address(),
      escrowFactory: this.#escrowFactory,
      protocolVersion: this.#protocolVersion
    });
  };

  /**
   * Get all the posts submitted to this feed
   *
   * @returns {Promise<ErasurePost[]>} array of ErasurePost objects
   */
  getPosts = async () => {
    let results = await Ethers.getProvider().getLogs({
      address: this.address(),
      topics: [ethers.utils.id("HashSubmitted(bytes32)")],
      fromBlock: 0
    });

    let posts = [];
    if (results && results.length > 1) {
      // First proofhash is that of feed creation.
      // so we can ignore it.
      results = results.slice(1);

      for (const result of results) {
        posts.push(
          new ErasurePost({
            owner: this.owner(),
            proofhash: result.data,
            feedAddress: this.address(),
            escrowFactory: this.#escrowFactory,
            protocolVersion: this.#protocolVersion
          })
        );
      }
    }

    return posts;
  };

  /**
   *
   * Create a new CountdownGriefingEscrow and deposit stake
   * - only called by feed owner
   * - add feed address to metadata
   * - add feed owner as staker
   *
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
    const operator = await Ethers.getAccount();
    if (Ethers.getAddress(operator) !== Ethers.getAddress(this.owner())) {
      throw new Error(
        `offerSell() can only be called by the owner: ${this.owner()}`
      );
    }

    const escrow = await this.#escrowFactory.create({
      operator,
      buyer,
      seller: this.owner(),
      paymentAmount,
      stakeAmount,
      escrowCountdown,
      griefRatio,
      griefRatioType,
      agreementCountdown,
      metadata: JSON.stringify({ feedAddress: this.address() })
    });

    return escrow;
  };

  /**
   * Get all escrows to sell this feed
   *
   * @returns {Promise<ErasureEscrow[]>} array of Escrow objects
   */
  getSellOffers = async () => {
    const results = await Ethers.getProvider().getLogs({
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
            paymentAmount,
            stakeAmount,
            metadata
          } = this.#escrowFactory.decodeParams(result.data);

          metadata = await IPFS.get(metadata);
          metadata = JSON.parse(metadata);

          if (
            metadata.feedAddress !== undefined &&
            metadata.feedAddress === this.address()
          ) {
            escrows.push(
              this.#escrowFactory.createClone({
                escrowAddress,
                buyer,
                seller,
                stakeAmount,
                paymentAmount
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
   * - add feed address to metadata
   * - add feed owner as staker
   * - add caller as buyer
   *
   * @param {Object} config - configuration for escrow
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
  offerBuy = async ({
    paymentAmount,
    stakeAmount,
    escrowCountdown,
    griefRatio,
    griefRatioType,
    agreementCountdown
  }) => {
    const buyer = await Ethers.getAccount();
    const seller = this.owner();

    const escrow = await this.#escrowFactory.create({
      operator: buyer,
      buyer,
      seller,
      paymentAmount,
      stakeAmount,
      escrowCountdown,
      griefRatio,
      griefRatioType,
      agreementCountdown,
      metadata: JSON.stringify({ feedAddress: this.address() })
    });

    return escrow;
  };

  /**
   * Get all escrows to buy this feed
   *
   * @returns {Promise} array of Escrow objects
   */
  getBuyOffers = async () => {
    const results = await Ethers.getProvider().getLogs({
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
          paymentAmount,
          stakeAmount,
          metadata
        } = this.#escrowFactory.decodeParams(result.data);

        if (seller === this.owner()) {
          metadata = await IPFS.get(metadata);
          metadata = JSON.parse(metadata);

          if (
            metadata.feedAddress !== undefined &&
            metadata.feedAddress === this.address()
          ) {
            escrows.push(
              this.#escrowFactory.createClone({
                escrowAddress,
                buyer,
                seller,
                stakeAmount,
                paymentAmount
              })
            );
          }
        }
      }
    }

    return escrows;
  };

  /**
   * Deposit stake on this feed (WIP)
   */
  stake() {}

  /**
   * Reveal all posts in this feed publically
   * - fetch symkey and upload to ipfs
   *
   * @returns {Promise} array of base58 multihash format of the ipfs address of the revealed keys
   */
  reveal = async () => {
    const posts = await this.getPosts();

    let hashes = [];
    for (const post of posts) {
      hashes.push(await post.reveal());
    }
    this.#revealed = true;

    return hashes;
  };

  /**
   * Get the status of the feed
   *
   * @returns {boolean} revealed bool true if the feed is revealed
   * @returns {integer} numSold number of times the feed was sold
   */
  checkStatus = () => {
    return {
      revealed: this.#revealed,
      numSold: this.#numSold
    };
  };
}

export default ErasureFeed;
