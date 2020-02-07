import { ethers } from "ethers";

import ErasureFeed from "../erasure/ErasureFeed";

import Abi from "../utils/Abi";
import Box from "../utils/3Box";
import IPFS from "../utils/IPFS";
import Utils from "../utils/Utils";
import Config from "../utils/Config";
import Contract from "../utils/Contract";
import Crypto from "../utils/Crypto";
import Ethers from "../utils/Ethers";
import ESP_1001 from "../utils/ESP_1001";

class Feed_Factory {
  #contract = null;
  #escrowFactory = null;
  #tokenManager = null;

  constructor({ escrowFactory, tokenManager }) {
    this.#escrowFactory = escrowFactory;
    this.#tokenManager = tokenManager;

    this.#contract = Contract.contract('Feed_Factory');
  }

  /**
   * Create a Feed contract using Feed_Factory
   *
   * @param {address} [operator]
   * @param {Object} [config.metadata] optional metadata object to add to erasure object
   * @returns {Promise<ErasureFeed>}
   */
  create = async ({ operator, metadata }) => {
    try {
      let encodedMetadata;
      if (metadata === undefined) {
        encodedMetadata = "0x";
      } else {
        encodedMetadata = await ESP_1001.encodeMetadata(metadata);
      }
      const callData = Abi.encodeWithSelector(
        "initialize",
        ["address", "bytes"],
        [operator, encodedMetadata],
      );

      // Creates the contract.
      const tx = await this.#contract.create(callData);
      const creationReceipt = await tx.wait();

      return new ErasureFeed({
        owner: operator,
        tokenManager: this.#tokenManager,
        feedAddress: creationReceipt.logs[0].address,
        escrowFactory: this.#escrowFactory,
        creationReceipt,
        encodedMetadata,
      });
    } catch (err) {
      throw err;
    }
  };

  createClone = async (address, creationReceipt) => {
    const logs = await Config.store.ethersProvider.getLogs({
      address,
      fromBlock: 0,
      topics: [ethers.utils.id("OperatorUpdated(address)")],
    });
    const owner = Ethers.getAddress(logs[logs.length - 1].data);

    const logsMetadata = await Config.store.ethersProvider.getLogs({
      address,
      fromBlock: 0,
      topics: [ethers.utils.id("MetadataSet(bytes)")],
    });

    let encodedMetadata;
    if (Array.isArray(logsMetadata) && logsMetadata.length) {
      encodedMetadata = logsMetadata[logsMetadata.length - 1].data;
    } else {
      encodedMetadata = "0x";
    }

    return new ErasureFeed({
      owner,
      feedAddress: address,
      escrowFactory: this.#escrowFactory,
      creationReceipt,
      encodedMetadata,
    });
  };

  getFeeds = async (user = null) => {
    try {
      const results = await Config.store.ethersProvider.getLogs({
        address: this.#contract.address,
        topics: [ethers.utils.id("InstanceCreated(address,address,bytes)")],
        fromBlock: 0,
      });

      let feeds = [];
      if (results && results.length > 0) {
        for (const result of results) {
          const owner = Ethers.getAddress(result.topics[2]);
          const feedAddress = Ethers.getAddress(result.topics[1]);

          if (user !== null && owner !== Ethers.getAddress(user)) {
            continue;
          }
          const logsMetadata = await Config.store.ethersProvider.getLogs({
            feedAddress,
            fromBlock: 0,
            topics: [ethers.utils.id("MetadataSet(bytes)")],
          });
          let encodedMetadata;
          if (Array.isArray(logsMetadata) && logsMetadata.length) {
            encodedMetadata = logsMetadata[logsMetadata.length - 1].data;
          } else {
            encodedMetadata = "0x";
          }

          feeds.push(
            new ErasureFeed({
              owner,
              feedAddress,
              escrowFactory: this.#escrowFactory,
              encodedMetadata,
            }),
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
