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
  constructor({ registry }) {
    this.contract = new Contract({
      abi: contract.abi,
      contractName: "Feed_Factory",
      registry
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
      const txReceipt = await tx.wait();

      return {
        id: txReceipt.logs[0].address,
        creator: operator,
        operator,
        posts: {},
        staticMetadataB58,
        createdTimestamp: new Date().toISOString()
      };
    } catch (err) {
      throw err;
    }
  }
}

export default Feed_Factory;
