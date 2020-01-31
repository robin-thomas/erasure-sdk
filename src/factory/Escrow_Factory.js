import { ethers } from "ethers";
import { constants } from "@erasure/crypto-ipfs";

import ErasureEscrow from "../erasure/ErasureEscrow";

import Abi from "../utils/Abi";
import Box from "../utils/3Box";
import IPFS from "../utils/IPFS";
import Utils from "../utils/Utils";
import Crypto from "../utils/Crypto";
import Ethers from "../utils/Ethers";

import { abi } from "@erasure/abis/src/v1.3.0/abis/CountdownGriefingEscrow_Factory.json";

class Escrow_Factory {
  #token = null;
  #receipt = null;
  #registry = null;
  #network = null;
  #contract = null;
  #erasureUsers = null;
  #web3Provider = null;
  #ethersProvider = null;
  #protocolVersion = "";

  constructor({
    token,
    registry,
    network,
    erasureUsers,
    web3Provider,
    ethersProvider,
    protocolVersion
  }) {
    this.#token = token;
    this.#network = network;
    this.#erasureUsers = erasureUsers;
    this.#web3Provider = web3Provider;
    this.#ethersProvider = ethersProvider;
    this.#protocolVersion = protocolVersion;

    this.#registry = registry.CountdownGriefingEscrow_Factory;
    this.#contract = new ethers.Contract(
      this.#registry,
      abi,
      Ethers.getWallet(this.#ethersProvider)
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
   * @param {string} config.operator
   * @param {string} config.buyer
   * @param {string} config.seller
   * @param {number} config.tokenId
   * @param {string} config.paymentAmount
   * @param {string} config.stakeAmount
   * @param {string} config.escrowCountdown
   * @param {string} config.greifRatio
   * @param {string} config.greifRatioType
   * @param {string} config.agreementCountdown
   * @param {string} config.metadata
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
    metadata
  }) => {
    try {
      metadata = metadata || "";

      // Convert the ipfs hash to multihash hex code.
      const staticMetadataB58 = await IPFS.add(metadata);
      const staticMetadata = await IPFS.hashToHex(staticMetadataB58);

      const agreementParams = Abi.encode(
        ["uint256", "uint8", "uint256"],
        [Ethers.parseEther(griefRatio), griefRatioType, agreementCountdown]
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
          "bytes"
        ],
        [
          operator,
          buyer,
          seller,
          tokenId,
          Ethers.parseEther(paymentAmount),
          Ethers.parseEther(stakeAmount),
          escrowCountdown,
          staticMetadata,
          agreementParams
        ]
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
        web3Provider: this.#web3Provider,
        ethersProvider: this.#ethersProvider,
        proofhash: JSON.parse(metadata).proofhash,
        erasureUsers: this.#erasureUsers,
        escrowAddress: creationReceipt.logs[0].address,
        protocolVersion: this.#protocolVersion,
        creationReceipt: creationReceipt
      });
    } catch (err) {
      throw err;
    }
  };

  createClone = ({
    buyer,
    seller,
    tokenId,
    proofhash,
    stakeAmount,
    paymentAmount,
    escrowAddress
  }) => {
    return new ErasureEscrow({
      buyer,
      seller,
      tokenId,
      proofhash,
      stakeAmount,
      paymentAmount,
      escrowAddress,
      token: this.#token,
      web3Provider: this.#web3Provider,
      ethersProvider: this.#ethersProvider,
      erasureUsers: this.#erasureUsers,
      protocolVersion: this.#protocolVersion
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
      "bytes"
    ];

    let result;
    if (encodedCalldata) {
      result = Abi.decodeWithSelector(
        "initialize",
        abiTypes,
        Abi.decode(["bytes"], data)[0]
      );
    } else {
      result = Abi.decode(abiTypes, data);
    }

    const agreementParams = Abi.decode(
      ["uint256", "uint8", "uint256"],
      result[8]
    );

    return {
      operator: Ethers.getAddress(result[0]),
      buyer: Ethers.getAddress(result[1]),
      seller: Ethers.getAddress(result[2]),
      tokenId: Number(result[3]),
      paymentAmount: Ethers.formatEther(result[4]).toString(),
      stakeAmount: Ethers.formatEther(result[5]).toString(),
      escrowCountdown: Ethers.formatEther(result[6].toString()),
      staticMetadataB58: Utils.hexToHash(result[7]),
      agreementParams: {
        griefRatio: Ethers.formatEther(agreementParams[0]).toString(),
        griefRatioType: agreementParams[1],
        agreementCountdown: agreementParams[2]
      }
    };
  };
}

export default Escrow_Factory;
