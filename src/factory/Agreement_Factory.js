import { ethers } from "ethers";
import { constants } from "@erasure/crypto-ipfs";

import Abi from "../utils/Abi";
import IPFS from "../utils/IPFS";
import Utils from "../utils/Utils";
import Ethers from "../utils/Ethers";
import Config from "../utils/Config";

import ErasureAgreement from "../erasure/ErasureAgreement";

import { abi as simpleContractAbi } from "@erasure/abis/src/v1.3.0/abis/SimpleGriefing_Factory.json";
import { abi as countdownContractAbi } from "@erasure/abis/src/v1.3.0/abis/CountdownGriefing_Factory.json";

class Agreement_Factory {
  #token = null;
  #registry = null;
  #contract = null;

  constructor({ token }) {
    this.#token = token;

    this.#registry = {
      SimpleGriefing_Factory: Config.store.registry.SimpleGriefing_Factory,
      CountdownGriefing_Factory: Config.store.registry.CountdownGriefing_Factory
    };
  }

  /**
   * Create a new agreement
   *
   * @param {Object} config
   * @param {string} config.operator
   * @param {string} config.staker
   * @param {string} config.counterparty
   * @param {number} config.tokenId
   * @param {string} config.griefRatio
   * @param {string} config.griefRatioType
   * @param {string} config.agreementCountdown
   * @param {string} config.metadata
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
    metadata
  }) => {
    let abi, agreementType;
    if (countdownLength !== undefined) {
      abi = countdownContractAbi;
      agreementType = "CountdownGriefing_Factory";
    } else {
      abi = simpleContractAbi;
      agreementType = "SimpleGriefing_Factory";
    }

    let address;
    if (process.env.NODE_ENV === "test") {
      address = this.#registry[agreementType];
    } else {
      address = this.#registry[Config.store.network][agreementType];
    }
    const contract = new ethers.Contract(
      address,
      abi,
      Ethers.getWallet(Config.store.ethersProvider)
    );

    const ipfsHash = await IPFS.add(metadata);
    const staticMetadata = await IPFS.hashToHex(ipfsHash);

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
        "bytes"
      ],
      [
        operator,
        staker,
        counterparty,
        tokenId,
        Ethers.parseEther(griefRatio),
        griefRatioType,
        ...(countdownLength !== undefined ? [countdownLength] : []),
        staticMetadata
      ]
    );

    const tx = await contract.create(callData);
    const creationReceipt = await tx.wait();

    return new ErasureAgreement({
      token: this.#token,
      tokenId,
      staker,
      griefRatio,
      counterparty,
      ethersProvider: Config.store.ethersProvider,
      type:
        agreementType === "CountdownGriefing_Factory" ? "countdown" : "simple",
      protocolVersion: Config.store.protocolVersion,
      agreementAddress: creationReceipt.logs[0].address,
      creationReceipt: creationReceipt
    });
  };

  createClone = ({
    address,
    type,
    tokenId,
    staker,
    griefRatio,
    counterparty
  }) => {
    return new ErasureAgreement({
      staker,
      counterparty,
      type,
      tokenId,
      griefRatio,
      token: this.#token,
      agreementAddress: address,
      ethersProvider: Config.store.ethersProvider,
      protocolVersion: Config.store.protocolVersion
    });
  };

  decodeParams = (data, countdown = true) => {
    const result = Abi.decode(
      [
        "address",
        "address",
        "address",
        "uint8",
        "uint256",
        "uint8",
        ...(countdown === true ? ["uint256"] : []),
        "bytes"
      ],
      data
    );

    return {
      operator: result[0],
      staker: result[1],
      counterparty: result[2],
      tokenId: result[3],
      griefRatio: Ethers.formatEther(result[4].toString()),
      griefRatioType: result[5],
      ...(countdown === true
        ? {
            countdownLength: result[6].toNumber(),
            metadata: Utils.hexToHash(result[7])
          }
        : {
            metadata: Utils.hexToHash(result[6])
          })
    };
  };
}

export default Agreement_Factory;
