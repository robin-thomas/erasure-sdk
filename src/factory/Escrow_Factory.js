import { ethers } from "ethers";
import { constants } from "@erasure/crypto-ipfs";

import ErasureEscrow from "../erasure/ErasureEscrow";

import Abi from "../utils/Abi";
import Box from "../utils/3Box";
import IPFS from "../utils/IPFS";
import Utils from "../utils/Utils";
import Config from "../utils/Config";
import Crypto from "../utils/Crypto";
import ESP_1001 from "../utils/ESP_1001";
import Ethers from "../utils/Ethers";

import { abi } from "@erasure/abis/src/v1.3.0/abis/CountdownGriefingEscrow_Factory.json";

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

    this.#contract = new ethers.Contract(
      Config.store.registry.CountdownGriefingEscrow_Factory,
      abi,
      Ethers.getWallet(Config.store.ethersProvider),
    );
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
   * @param {number} config.tokenId
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
    tokenId = constants.TOKEN_TYPES.NMR,
    paymentAmount,
    stakeAmount,
    escrowCountdown,
    griefRatio,
    griefRatioType,
    agreementCountdown,
    metadata,
  }) => {
    try {
      metadata = metadata || "";

      const encodedMetadata = await ESP_1001.encodeMetadata(metadata);

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
          tokenId,
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
        tokenId,
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
    tokenId,
    stakeAmount,
    paymentAmount,
    escrowAddress,
    creationReceipt,
    encodedMetadata,
  }) => {
    return new ErasureEscrow({
      buyer,
      seller,
      tokenId,
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
      tokenId: Number(result[3]),
      paymentAmount: Ethers.formatEther(result[4]).toString(),
      stakeAmount: Ethers.formatEther(result[5]).toString(),
      escrowCountdown: Ethers.formatEther(result[6].toString()),
      encodedMetadata: result[7],
      agreementParams: {
        griefRatio: Ethers.formatEther(agreementParams[0]).toString(),
        griefRatioType: agreementParams[1],
        agreementCountdown: agreementParams[2],
      },
    };
  };
}

export default Escrow_Factory;
