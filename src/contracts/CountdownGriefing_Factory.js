import CryptoIPFS from "@erasure/crypto-ipfs";

import Abi from "../utils/Abi";
import IPFS from "../utils/IPFS";
import Ethers from "../utils/Ethers";
import Contract from "../utils/Contract";

import contract from "../../artifacts/CountdownGriefing_Factory.json";

class CountdownGriefing_Factory {
  /**
   * CountdownGriefing_Factory
   *
   * @constructor
   * @param {Object} config - configuration for CountdownGriefing_Factory
   * @param {string} config.network - eth network string
   * @param {Object} config.web3 - web3 object
   */
  constructor({ network }) {
    this.network = network;

    this.contract = new Contract({
      network,
      abi: contract.abi,
      contractName: "CountdownGriefing_Factory"
    });
  }

  /**
   * Create a CountdownGriefing contract using CountdownGriefing_Factory
   *
   * @param {Object} config - configuration for createExplicit
   * @param {string} config.counterParty - party with whom the agreement to be made
   * @param {number} config.countdownLength - duration of the agreement in seconds
   * @param {string} [config.ratio] - griefing ratio
   * @param {number} [config.ratioType] - griefing ratio type
   * @param {string} [config.hash] - IPFS hash of ErasureAgreement version
   * @param {string} [config.data] - data of ErasureAgreement version to be uploaded to IPFS
   * @returns {Promise} ipfsHash, txHash and address of new feed
   */
  async create({
    counterParty,
    countdownLength,
    ratio,
    ratioType,
    hash,
    data = null
  }) {
    try {
      const operator = Ethers.getAccount();

      if (!Ethers.isAddress(counterParty)) {
        throw new Error(`CounterParty ${counterParty} is not an address`);
      }

      // Convert the ipfs hash to multihash hex code.
      let ipfsHash = hash;
      if (data) {
        ipfsHash = await IPFS.add(data);
      }
      const staticMetadata = CryptoIPFS.ipfs.hashToHex(ipfsHash);

      const callData = Abi.abiEncodeWithSelector(
        "initialize",
        [
          "address",
          "address",
          "address",
          "uint256",
          "uint8",
          "uint256",
          "bytes"
        ],
        [
          operator,
          operator,
          counterParty,
          Ethers.parseEther(ratio),
          ratioType,
          countdownLength,
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

export default CountdownGriefing_Factory;
