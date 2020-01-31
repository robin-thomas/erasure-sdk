import { ethers } from "ethers";

import ErasureFeed from "../erasure/ErasureFeed";

import Abi from "../utils/Abi";
import Box from "../utils/3Box";
import IPFS from "../utils/IPFS";
import Utils from "../utils/Utils";
import Crypto from "../utils/Crypto";
import Ethers from "../utils/Ethers";

import { abi } from "@erasure/abis/src/v1.3.0/abis/Feed_Factory.json";

class Feed_Factory {
  #registry = null;
  #network = null;
  #contract = null;
  #escrowFactory = null;
  #web3Provider = null;
  #ethersProvider = null;
  #protocolVersion = "";

  constructor({
    registry,
    network,
    web3Provider,
    ethersProvider,
    protocolVersion,
    escrowFactory
  }) {
    this.#network = network;
    this.#escrowFactory = escrowFactory;
    this.#protocolVersion = protocolVersion;

    this.#web3Provider = web3Provider;
    this.#ethersProvider = ethersProvider;

    this.#registry = registry.Feed_Factory;
    this.#contract = new ethers.Contract(
      this.#registry,
      abi,
      Ethers.getWallet(this.#ethersProvider)
    );
  }

  /**
   * Create a Feed contract using Feed_Factory
   *
   * @param {address} operator
   * @param {string} metadata
   * @returns {Promise<ErasureFeed>}
   */
  create = async ({ operator, metadata }) => {
    try {
      // Convert the ipfs hash to multihash hex code.
      const staticMetadataB58 = await IPFS.add(metadata);
      const staticMetadata = await IPFS.hashToHex(staticMetadataB58);

      const callData = Abi.encodeWithSelector(
        "initialize",
        ["address", "bytes"],
        [operator, staticMetadata]
      );

      // Creates the contract.
      const tx = await this.#contract.create(callData);
      const creationReceipt = await tx.wait();

      return new ErasureFeed({
        owner: operator,
        web3Provider: this.#web3Provider,
        ethersProvider: this.#ethersProvider,
        feedAddress: creationReceipt.logs[0].address,
        escrowFactory: this.#escrowFactory,
        protocolVersion: this.#protocolVersion,
        creationReceipt: creationReceipt
      });
    } catch (err) {
      throw err;
    }
  };

  createClone = async address => {
    const logs = await this.#ethersProvider.getLogs({
      address,
      fromBlock: 0,
      topics: [ethers.utils.id("OperatorUpdated(address)")]
    });
    const owner = Ethers.getAddress(logs[logs.length - 1].data);

    return new ErasureFeed({
      owner,
      feedAddress: address,
      web3Provider: this.#web3Provider,
      ethersProvider: this.#ethersProvider,
      escrowFactory: this.#escrowFactory,
      protocolVersion: this.#protocolVersion
    });
  };

  getFeeds = async (user = null) => {
    try {
      const results = await this.#ethersProvider.getLogs({
        address: this.#contract.address,
        topics: [ethers.utils.id("InstanceCreated(address,address,bytes)")],
        fromBlock: 0
      });

      let feeds = [];
      if (results && results.length > 0) {
        for (const result of results) {
          const owner = Ethers.getAddress(result.topics[2]);
          const feedAddress = Ethers.getAddress(result.topics[1]);

          if (user !== null && owner !== Ethers.getAddress(user)) {
            continue;
          }

          feeds.push(
            new ErasureFeed({
              owner,
              feedAddress,
              web3Provider: this.#web3Provider,
              ethersProvider: this.#ethersProvider,
              escrowFactory: this.#escrowFactory,
              protocolVersion: this.#protocolVersion
            })
          );
        }
      }

      return feeds;
    } catch (err) {
      throw err;
    }
  };
}

export default Feed_Factory;
