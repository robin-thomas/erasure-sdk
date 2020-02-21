import { ethers } from "ethers";
import { constants } from "@erasure/crypto-ipfs";

import ErasureEscrow from "../erasure/ErasureEscrow";

import Abi from "../utils/Abi";
import Box from "../utils/3Box";
import IPFS from "../utils/IPFS";
import Utils from "../utils/Utils";
import Config from "../utils/Config";
import Crypto from "../utils/Crypto";
import Contract from "../utils/Contract";
import ESP_1001 from "../utils/ESP_1001";
import Ethers from "../utils/Ethers";

class Escrow_Factory {
  #token = null;
  #receipt = null;
  #registry = null;
  #network = null;
  #contract = null;
  #erasureUsers = null;

  constructor({ token, erasureUsers }) {
    this.#token = token;
    this.#erasureUsers = erasureUsers;

    this.#contract = Contract.contract("CountdownGriefingEscrow_Factory");
  }

  /**
   * Access the web3 contract class
   *
   * @memberof ErasureEscrow
   * @method contract
   * @returns {Object} contract object
   */
  contract = () => {
    return this.#contract;
  };

  address = () => {
    return this.contract().address;
  };

  /**
   * Create a new escrow
   *
   * @param {Object} config
   * @param {string} [config.operator]
   * @param {string} config.buyer
   * @param {string} config.seller
   * @param {number} config.tokenID
   * @param {string} config.paymentAmount
   * @param {string} config.stakeAmount
   * @param {string} config.escrowCountdown
   * @param {string} config.greifRatio
   * @param {string} config.greifRatioType
   * @param {string} config.agreementCountdown
   * @param {Object} [config.metadata] optional metadata object to add to erasure object
   * @returns {Promise<ErasureEscrow>}
   */
  create = async ({
    operator,
    buyer,
    seller,
    tokenID = constants.TOKEN_TYPES.NMR,
    paymentAmount,
    stakeAmount,
    escrowCountdown,
    griefRatio,
    griefRatioType,
    agreementCountdown,
    metadata,
  }) => {
    try {
      let encodedMetadata;
      if (metadata === undefined) {
        encodedMetadata = "0x";
      } else {
        encodedMetadata = await ESP_1001.encodeMetadata(metadata);
      }

      const agreementParams = Abi.encode(
        ["uint256", "uint8", "uint256"],
        [Ethers.parseEther(griefRatio), griefRatioType, agreementCountdown],
      );

      const callData = Abi.encodeWithSelector(
        "initialize",
        [
          "address",
          "address",
          "address",
          "uint8",
          "uint256",
          "uint256",
          "uint256",
          "bytes",
          "bytes",
        ],
        [
          operator,
          buyer,
          seller,
          tokenID,
          Ethers.parseEther(paymentAmount),
          Ethers.parseEther(stakeAmount),
          escrowCountdown,
          encodedMetadata,
          agreementParams,
        ],
      );

      // Creates the contract.
      const tx = await this.contract().create(callData);
      const creationReceipt = await tx.wait();

      return new ErasureEscrow({
        buyer,
        seller,
        tokenID,
        stakeAmount,
        paymentAmount,
        token: this.#token,
        erasureUsers: this.#erasureUsers,
        escrowAddress: creationReceipt.logs[0].address,
        creationReceipt,
        encodedMetadata,
      });
    } catch (err) {
      throw err;
    }
  };

  createClone = ({
    buyer,
    seller,
    tokenID,
    stakeAmount,
    paymentAmount,
    escrowAddress,
    creationReceipt,
    encodedMetadata,
  }) => {
    return new ErasureEscrow({
      buyer,
      seller,
      tokenID,
      stakeAmount,
      paymentAmount,
      escrowAddress,
      token: this.#token,
      erasureUsers: this.#erasureUsers,
      creationReceipt,
      encodedMetadata,
    });
  };

  decodeParams = (data, encodedCalldata = true) => {
    const abiTypes = [
      "address",
      "address",
      "address",
      "uint8",
      "uint256",
      "uint256",
      "uint256",
      "bytes",
      "bytes",
    ];

    let result;
    if (encodedCalldata) {
      result = Abi.decodeWithSelector(
        "initialize",
        abiTypes,
        Abi.decode(["bytes"], data)[0],
      );
    } else {
      result = Abi.decode(abiTypes, data);
    }

    const agreementParams = Abi.decode(
      ["uint256", "uint8", "uint256"],
      result[8],
    );

    return {
      operator: Ethers.getAddress(result[0]),
      buyer: Ethers.getAddress(result[1]),
      seller: Ethers.getAddress(result[2]),
      tokenID: Number(result[3]),
      paymentAmount: Ethers.formatEther(result[4]).toString(),
      stakeAmount: Ethers.formatEther(result[5]).toString(),
      escrowCountdown: Ethers.formatEther(result[6].toString()),
      encodedMetadata: result[7],
      agreementParams: {
        griefRatio: Ethers.formatEther(agreementParams[0]).toString(),
        griefRatioType: agreementParams[1],
        agreementCountdown: agreementParams[2].toNumber(),
      },
    };
  };
}

export default Escrow_Factory;
