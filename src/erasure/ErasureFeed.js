import { ethers } from 'ethers'
import { constants } from '@erasure/crypto-ipfs'

import ErasurePost from './ErasurePost'
import Escrow_Factory from '../factory/Escrow_Factory'

import Abi from '../utils/Abi'
import Box from '../utils/3Box'
import IPFS from '../utils/IPFS'
import Utils from '../utils/Utils'
import Crypto from '../utils/Crypto'
import Ethers from '../utils/Ethers'
import Config from '../utils/Config'

import { abi } from '@erasure/abis/src/v1.3.0/abis/Feed.json'

class ErasureFeed {
  #owner = null
  #tokenManager = null
  #numSold = 0
  #contract = null
  #feedAddress = null
  #escrowFactory = null
  #web3Provider = null
  #ethersProvider = null
  #protocolVersion = ''
  #creationReceipt = null

  /**
   * @constructor
   * @param {Object} config
   * @param {string} config.owner
   * @param {Object} config.tokenManager
   * @param {string} config.feedAddress
   * @param {Object} config.web3Provider
   * @param {string} config.protocolVersion
   * @param {Object} config.creationReceipt
   */
  constructor({
    owner,
    tokenManager,
    feedAddress,
    web3Provider,
    ethersProvider,
    protocolVersion,
    escrowFactory,
    creationReceipt,
  }) {
    this.#owner = owner
    this.#tokenManager = tokenManager
    this.#feedAddress = feedAddress
    this.#escrowFactory = escrowFactory
    this.#web3Provider = web3Provider
    this.#ethersProvider = ethersProvider
    this.#protocolVersion = protocolVersion
    this.#creationReceipt = creationReceipt

    this.#contract = new ethers.Contract(
      feedAddress,
      abi,
      Ethers.getWallet(this.#ethersProvider),
    )
  }

  /**
   * Access the web3 contract class
   *
   * @memberof ErasureFeed
   * @method contract
   */
  contract = () => {
    return this.#contract
  }

  /**
   * Get the address of this feed
   *
   * @memberof ErasureFeed
   * @method address
   * @returns {address} address of the feed
   */
  address = () => {
    return this.#feedAddress
  }

  /**
   * Get the creationReceipt of this feed
   *
   * @memberof ErasureFeed
   * @method creationReceipt
   * @returns {Object}
   */
  creationReceipt = () => {
    return this.#creationReceipt
  }

  /**
   * Get the creation timestamp of this feed
   *
   * @memberof ErasureFeed
   * @method getCreationTimestamp
   * @returns {integer}
   */
  getCreationTimestamp = async () => {
    const block = await Config.store.ethersProvider.getBlock(
      this.#creationReceipt.blockNumber,
    )
    return block.timestamp
  }

  /**
   * Get the address of the owner of this feed
   *
   * @memberof ErasureFeed
   * @method owner
   * @returns {address} address of the owner
   */
  owner = () => {
    return this.#owner
  }

  /**
   * Get the amount of a tokens staked on this feed
   *
   * @memberof ErasureFeed
   * @method getStake
   * @returns {Promise} amount of tokens at stake
   */
  getStake = async () => {
    return {
      NMR: Ethers.formatEther(
        await this.#contract.getStake(constants.TOKEN_TYPES.NMR),
      ),
      DAI: Ethers.formatEther(
        await this.#contract.getStake(constants.TOKEN_TYPES.DAI),
      ),
    }
  }

  /**
   * Get the amount of a tokens staked on this feed
   *
   * @memberof ErasureFeed
   * @method getStakeByTokenID
   * @param {integer} tokenID - token identifier for the erasure protocol
   * @returns {Promise} amount of tokens at stake
   */
  getStakeByTokenID = async tokenID => {
    const stake = await this.#contract.getStake(tokenID)
    return Ethers.formatEther(stake)
  }

  /**
   * Deposit tokens as a stake on this feed
   *
   * @memberof ErasureFeed
   * @method depositStake
   * @param {integer} tokenID - token identifier for the erasure protocol
   * @param {decimal} amount - amount of tokens to deposit
   * @returns {Promise} transaction receipt
   */
  depositStake = async (tokenID, amount) => {
    const stakeAmount = Ethers.parseEther(amount)
    await this.#tokenManager.approve(tokenID, this.address(), stakeAmount)

    return this.#contract.depositStake(tokenID, stakeAmount)
  }

  /**
   * Withdraw tokens as a stake on this feed
   *
   * @memberof ErasureFeed
   * @method withdrawStake
   * @param {integer} tokenID - token identifier for the erasure protocol
   * @param {decimal} [amount] - amount of tokens to withdraw, defaults to full amount
   * @returns {Promise} transaction receipt
   */
  withdrawStake = async (tokenID, amount = null) => {
    if (amount === null) {
      amount = await this.getStakeByTokenID(tokenID)
    }
    const stakeAmount = Ethers.parseEther(amount)
    return this.#contract.withdrawStake(tokenID, stakeAmount)
  }

  /**
   * Submit new data to this feed
   * - can only called by feed owner
   *
   * @memberof ErasureFeed
   * @method createPost
   * @param {string} data - raw data to be posted
   * @param {string} [proofhash]
   * @returns {Promise<ErasurePost>}
   * {@link https://github.com/erasureprotocol/erasure-protocol#track-record-through-posts-and-feeds}
   */
  createPost = async (data, proofhash = null) => {
    try {
      const operator = await Ethers.getAccount(this.#ethersProvider)
      if (Ethers.getAddress(operator) !== Ethers.getAddress(this.owner())) {
        throw new Error(
          `createPost() can only be called by the owner: ${this.owner()}`,
        )
      }

      if (proofhash === null) {
        // Get the IPFS hash of the post without uploading it to IPFS.
        const datahash = await IPFS.getHash(data)

        const symKey = Crypto.symmetric.genKey()
        const keyhash = await IPFS.getHash(symKey)

        // Store the symKey in the keystore.
        await Box.setSymKey(keyhash, symKey, this.#web3Provider)

        const encryptedPost = Crypto.symmetric.encrypt(symKey, data)
        const encryptedDatahash = await IPFS.add(encryptedPost)

        const staticMetadataB58 = await IPFS.add(
          JSON.stringify({
            creator: operator,
            datahash,
            keyhash,
            encryptedDatahash,
          }),
        )
        proofhash = Utils.hashToSha256(staticMetadataB58)
      }

      const tx = await this.contract().submitHash(proofhash)
      const creationReceipt = await tx.wait()

      return new ErasurePost({
        proofhash,
        owner: this.owner(),
        feedAddress: this.address(),
        escrowFactory: this.#escrowFactory,
        web3Provider: this.#web3Provider,
        ethersProvider: this.#ethersProvider,
        protocolVersion: this.#protocolVersion,
        creationReceipt,
      })
    } catch (err) {
      throw err
    }
  }

  createClone = async proofhash => {
    const logs = await Config.store.ethersProvider.getLogs({
      address: this.address(),
      fromBlock: 0,
      topics: [ethers.utils.id('HashSubmitted(bytes32)')],
    })
    const found = logs.find(element => {
      if (element.data === proofhash) {
        return element
      }
    })
    const creationReceipt = await Config.store.ethersProvider.getTransactionReceipt(
      found.transactionHash,
    )
    return new ErasurePost({
      proofhash,
      owner: this.owner(),
      feedAddress: this.address(),
      escrowFactory: this.#escrowFactory,
      web3Provider: this.#web3Provider,
      ethersProvider: this.#ethersProvider,
      protocolVersion: this.#protocolVersion,
      creationReceipt,
    })
  }

  /**
   * Get all the posts submitted to this feed
   *
   * @memberof ErasureFeed
   * @method getPosts
   * @returns {Promise<ErasurePost[]>} array of ErasurePost objects
   */
  getPosts = async () => {
    let results = await this.#ethersProvider.getLogs({
      address: this.address(),
      topics: [ethers.utils.id('HashSubmitted(bytes32)')],
      fromBlock: 0,
    })

    let posts = []
    if (results && results.length > 0) {
      for (const result of results) {
        const creationReceipt = await Config.store.ethersProvider.getTransactionReceipt(
          result.transactionHash,
        )
        posts.push(
          new ErasurePost({
            owner: this.owner(),
            proofhash: result.data,
            feedAddress: this.address(),
            web3Provider: this.#web3Provider,
            ethersProvider: this.#ethersProvider,
            escrowFactory: this.#escrowFactory,
            protocolVersion: this.#protocolVersion,
            creationReceipt,
          }),
        )
      }
    }

    return posts
  }

  /**
   * Reveal all posts in this feed publically
   * - fetch symkey and upload to ipfs
   *
   * @memberof ErasureFeed
   * @method reveal
   * @returns {Promise} array of base58 multihash format of the ipfs address of the revealed keys
   */
  reveal = async () => {
    const posts = await this.getPosts()

    let hashes = []
    for (const post of posts) {
      hashes.push(await post.reveal())
    }

    return hashes
  }

  /**
   * Get the status of the feed
   *
   * @memberof ErasureFeed
   * @method checkStatus
   * @returns {Promise} revealed bool true if the feed is revealed
   */
  checkStatus = async () => {
    let revealed = false

    const posts = await this.getPosts()
    for (const post of posts) {
      if (await post.isRevealed()) {
        revealed = true
        break
      }
    }

    return { revealed }
  }
}

export default ErasureFeed
