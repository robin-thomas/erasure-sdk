import CryptoIPFS from "@erasure/crypto-ipfs";

import Abi from "../utils/Abi";
import IPFS from "../utils/IPFS";
import Ethers from "../utils/Ethers";
import Contract from "../utils/Contract";

import contract from "../../artifacts/SimpleGriefing_Factory.json";

class SimpleGriefing_Factory {
  /**
   * SimpleGriefing_Factory
   *
   * @constructor
   * @param {Object} config - configuration for SimpleGriefing_Factory
   * @param {Object} [config.registry] - for testing purposes
   */
  constructor({ registry, protocolVersion }) {
    this.contract = new Contract({
      abi: contract.abi,
      contractName: "SimpleGriefing_Factory",
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
   * Create a SimpleGriefing contract using SimpleGriefing_Factory
   *
   * @param {Object} config - configuration for createExplicit
   * @param {string} config.counterParty - party with whom the agreement to be made
   * @param {string} [config.ratio] - griefing ratio
   * @param {number} [config.ratioType] - griefing ratio type
   * @param {string} config.data - data of ErasureAgreement version to be uploaded to IPFS
   * @returns {Promise} ipfsHash, txHash and address of new feed
   */
  async create({ counterParty, ratio, ratioType, data }) {
    try {
      const operator = await Ethers.getAccount();

      if (!Ethers.isAddress(counterParty)) {
        throw new Error(`CounterParty ${counterParty} is not an address`);
      }

      // Convert the ipfs hash to multihash hex code.
      const ipfsHash = await IPFS.add(data);
      const staticMetadata = CryptoIPFS.ipfs.hashToHex(ipfsHash);

      const callData = Abi.abiEncodeWithSelector(
        "initialize",
        ["address", "address", "address", "uint256", "uint8", "bytes"],
        [
          operator,
          operator,
          counterParty,
          Ethers.parseEther(ratio),
          ratioType,
          staticMetadata
        ]
      );

      const tx = await this.contract.contract.create(callData);
      const txReceipt = await tx.wait();

      return {
        ipfsHash,
        txHash: tx.hash,
        address: txReceipt.logs[0].address
      };
    } catch (err) {
      throw err;
    }
  }
}

export default SimpleGriefing_Factory;
