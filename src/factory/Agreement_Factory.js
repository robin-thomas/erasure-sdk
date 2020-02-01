import { ethers } from "ethers";
import { constants } from "@erasure/crypto-ipfs";

import { abi as simpleContractAbi } from "@erasure/abis/src/v1.3.0/abis/SimpleGriefing_Factory.json";
import { abi as countdownContractAbi } from "@erasure/abis/src/v1.3.0/abis/CountdownGriefing_Factory.json";

import ErasureAgreement from "../erasure/ErasureAgreement";

import Abi from "../utils/Abi";
import IPFS from "../utils/IPFS";
import Utils from "../utils/Utils";
import Ethers from "../utils/Ethers";
import Config from "../utils/Config";
import ESP_1001 from "../utils/ESP_1001";

class Agreement_Factory {
  #token = null;
  #contract = null;

  constructor({ token }) {
    this.#token = token;
  }

  /**
   * Create a new agreement
   *
   * @param {Object} config
   * @param {string} [config.operator]
   * @param {string} config.staker
   * @param {string} config.counterparty
   * @param {number} config.tokenId
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
    tokenId = constants.TOKEN_TYPES.NMR,
    griefRatio,
    griefRatioType,
    countdownLength,
    metadata,
  }) => {
    let abi, agreementType;
    if (countdownLength !== undefined) {
      abi = countdownContractAbi;
      agreementType = "CountdownGriefing_Factory";
    } else {
      abi = simpleContractAbi;
      agreementType = "SimpleGriefing_Factory";
    }

    const contract = new ethers.Contract(
      Config.store.registry[agreementType],
      abi,
      Ethers.getWallet(Config.store.ethersProvider),
    );

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
        tokenId,
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
      tokenId,
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
    tokenId,
    staker,
    griefRatio,
    counterparty,
    creationReceipt,
    encodedMetadata,
  }) => {
    return new ErasureAgreement({
      token: this.#token,
      tokenId,
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
        tokenId: result[3],
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
        tokenId: result[3],
        griefRatio: Ethers.formatEther(result[4].toString()),
        griefRatioType: result[5],
        encodedMetadata: result[6],
      };
    }
  };
}

export default Agreement_Factory;
