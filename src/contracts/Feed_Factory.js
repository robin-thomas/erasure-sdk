import { ethers } from "ethers";
import CryptoIPFS from "@erasure/crypto-ipfs";

import Abi from "../utils/Abi";
import IPFS from "../utils/IPFS";
import Ethers from "../utils/Ethers";
import Contract from "../utils/Contract";

import contract from "../../artifacts/Feed_Factory.json";

class Feed_Factory {
  /**
   * Feed_Factory
   *
   * @constructor
   * @param {Object} config - configuration for Feed_Factory
   * @param {Object} [config.registry] - for testing purposes
   */
  constructor({ registry, protocolVersion }) {
    this.contract = new Contract({
      abi: contract.abi,
      contractName: "Feed_Factory",
      registry,
      protocolVersion
    });
  }

  /**
   * Login to metamask
   *
   */
  async login() {
    return await this.contract.login();
  }

  /**
   * Create a Feed contract using Feed_Factory
   *
   * @param {string} data - data of ErasureFeed version to be uploaded to IPFS
   * @returns {Promise} ipfsHash, txHash and address of new feed
   */
  async create(data) {
    try {
      const operator = await Ethers.getAccount();

      // Convert the ipfs hash to multihash hex code.
      const staticMetadataB58 = await IPFS.add(data);
      const staticMetadata = CryptoIPFS.ipfs.hashToHex(staticMetadataB58);
      const proofHash = IPFS.hexToSha256(staticMetadata);

      const callData = Abi.abiEncodeWithSelector(
        "initialize",
        ["address", "bytes32", "bytes"],
        [operator, proofHash, staticMetadata]
      );

      // Creates the contract.
      const tx = await this.contract.contract.create(callData);
      const receipt = await tx.wait();

      return {
        receipt,
        address: receipt.logs[0].address
      };
    } catch (err) {
      throw err;
    }
  }

  async getFeeds() {
    try {
      const provider = Ethers.getProvider();

      const results = await provider.getLogs({
        address: this.contract.getAddress(),
        topics: [ethers.utils.id("InstanceCreated(address,address,bytes)")],
        fromBlock: 0
      });

      let feeds = [];
      if (results && results.length > 0) {
        const abiCoder = ethers.utils.defaultAbiCoder;

        for (const result of results) {
          const data = abiCoder.decode(["bytes"], result.data)[0];
          const callData = Abi.abiDecodeWithSelector(
            "initialize",
            ["address", "bytes32", "bytes"],
            data
          );

          const address = Ethers.getAddress(result.topics[1]);
          feeds.push({
            address,
            operator: Ethers.getAddress(result.topics[2]),
            ipfsMultihash: IPFS.hexToHash(callData[2])
          });
        }
      }

      return feeds;
    } catch (err) {
      throw err;
    }
  }
}

export default Feed_Factory;
