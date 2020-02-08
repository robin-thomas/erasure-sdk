import { ethers } from "ethers";
import { constants } from "@erasure/crypto-ipfs";

import ErasureAgreement from "../erasure/ErasureAgreement";

import Abi from "../utils/Abi";
import IPFS from "../utils/IPFS";
import Utils from "../utils/Utils";
import Ethers from "../utils/Ethers";
import Config from "../utils/Config";
import Contract from "../utils/Contract";
import ESP_1001 from "../utils/ESP_1001";

class Agreement_Factory {
  #token = null;
  #contract = null;

  constructor({ token }) {
    this.#token = token;
  }

  /**
   * Access the web3 contract class
   *
   * @memberof Agreement_Factory
   * @method contract
   * @returns {Object} contract object
   */
  contract = type => {
    const agreementType = type !== "simple" ? "CountdownGriefing_Factory" : "SimpleGriefing_Factory";
    return Contract.contract(agreementType);
  };

  /**
   * Create a new agreement
   *
   * @param {Object} config
   * @param {string} [config.operator]
   * @param {string} config.staker
   * @param {string} config.counterparty
   * @param {number} config.tokenID
   * @param {string} config.griefRatio
   * @param {string} config.griefRatioType
   * @param {string} config.agreementCountdown
   * @param {Object} [config.metadata] optional metadata object to add to erasure object
   * @returns {Promise<ErasureAgreement>}
   */
  create = async ({
    operator,
    staker,
    counterparty,
    tokenID = constants.TOKEN_TYPES.NMR,
    griefRatio,
    griefRatioType,
    countdownLength,
    metadata,
  }) => {
    const agreementType = countdownLength !== undefined ? "CountdownGriefing_Factory" : "SimpleGriefing_Factory";
    const contract = Contract.contract(agreementType);

    let encodedMetadata;
    if (metadata === undefined) {
      encodedMetadata = "0x";
    } else {
      encodedMetadata = await ESP_1001.encodeMetadata(metadata);
    }

    const callData = Abi.encodeWithSelector(
      "initialize",
      [
        "address",
        "address",
        "address",
        "uint8",
        "uint256",
        "uint8",
        ...(countdownLength !== undefined ? ["uint256"] : []),
        "bytes",
      ],
      [
        operator,
        staker,
        counterparty,
        tokenID,
        Ethers.parseEther(griefRatio),
        griefRatioType,
        ...(countdownLength !== undefined ? [countdownLength] : []),
        encodedMetadata,
      ],
    );

    const tx = await contract.create(callData);
    const creationReceipt = await tx.wait();

    return new ErasureAgreement({
      token: this.#token,
      tokenID,
      staker,
      griefRatio,
      counterparty,
      type:
        agreementType === "CountdownGriefing_Factory" ? "countdown" : "simple",
      agreementAddress: creationReceipt.logs[0].address,
      creationReceipt,
      encodedMetadata,
    });
  };

  createClone = ({
    address,
    type,
    tokenID,
    staker,
    griefRatio,
    counterparty,
    creationReceipt,
    encodedMetadata,
  }) => {
    return new ErasureAgreement({
      token: this.#token,
      tokenID,
      staker,
      griefRatio,
      counterparty,
      type,
      agreementAddress: address,
      creationReceipt,
      encodedMetadata,
    });
  };

  decodeParams = (data, countdown = true) => {
    if (countdown) {
      const result = Abi.decode(
        [
          "address",
          "address",
          "address",
          "uint8",
          "uint256",
          "uint8",
          "uint256",
          "bytes",
        ],
        data,
      );
      return {
        operator: result[0],
        staker: result[1],
        counterparty: result[2],
        tokenID: result[3],
        griefRatio: Ethers.formatEther(result[4].toString()),
        griefRatioType: result[5],
        countdownLength: result[6].toNumber(),
        encodedMetadata: result[7],
      };
    } else {
      const result = Abi.decode(
        ["address", "address", "address", "uint8", "uint256", "uint8", "bytes"],
        data,
      );
      return {
        operator: result[0],
        staker: result[1],
        counterparty: result[2],
        tokenID: result[3],
        griefRatio: Ethers.formatEther(result[4].toString()),
        griefRatioType: result[5],
        encodedMetadata: result[6],
      };
    }
  };
}

export default Agreement_Factory;
