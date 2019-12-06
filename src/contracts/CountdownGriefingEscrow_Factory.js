import CryptoIPFS from "@erasure/crypto-ipfs";

import Abi from "../utils/Abi";
import IPFS from "../utils/IPFS";
import Ethers from "../utils/Ethers";
import Contract from "../utils/Contract";

import contract from "../../artifacts/CountdownGriefingEscrow_Factory.json";

class CountdownGriefingEscrow_Factory {
  /**
   * CountdownGriefing_Factory
   *
   * @constructor
   * @param {Object} config - configuration for CountdownGriefing_Factory
   * @param {Object} [config.registry] - for testing purposes
   * @param {Object} config.protocolVersion - erasure protocolVersion
   */
  constructor(opts) {
    const contractName = "CountdownGriefingEscrow_Factory";

    this.contract = new Contract({
      abi: contract.abi,
      contractName,
      ...opts
    });
  }

  /**
   * Create a CountdownGriefing contract using CountdownGriefing_Factory
   *
   * @param {Object} config - configuration for createExplicit
   * @param {string} config.counterParty - party with whom the agreement to be made
   * @param {number} config.agreementCountdown - duration of the agreement in seconds
   * @param {number} config.escrowCountdown - duration of the escrow in seconds
   * @param {number} config.paymentAmount
   * @param {number} config.stakeAmount
   * @param {string} [config.ratio] - griefing ratio
   * @param {number} [config.ratioType] - griefing ratio type
   * @param {string} config.data - data of ErasureAgreement version to be uploaded to IPFS
   * @returns {Promise} ipfsHash, txHash and address of new feed
   */
  async create({
    counterParty,
    agreementCountdown,
    paymentAmount,
    stakeAmount,
    ratio,
    ratioType,
    data
  }) {
    try {
      const operator = await Ethers.getAccount();

      if (!Ethers.isAddress(counterParty)) {
        throw new Error(`CounterParty ${counterParty} is not an address`);
      }

      // Convert the ipfs hash to multihash hex code.
      const ipfsHash = await IPFS.add(data);
      const staticMetadata = CryptoIPFS.ipfs.hashToHex(ipfsHash);

      const agreementParams = Abi.encode(
        ["uint256", "uint8", "uint256"],
        [Ethers.parseEther(ratio), ratioType, agreementCountdown]
      );

      const callData = Abi.encodeWithSelector(
        "initialize",
        [
          "address",
          "address",
          "address",
          "uint256",
          "uint256",
          "uint256",
          "bytes",
          "bytes"
        ],
        [
          operator,
          operator,
          counterParty,
          Ethers.parseEther(paymentAmount),
          Ethers.parseEther(stakeAmount),
          escrowCountdown,
          staticMetadata,
          agreementParams
        ]
      );

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
}

export default CountdownGriefingEscrow_Factory;
