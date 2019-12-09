import { ethers } from "ethers";
import CryptoIPFS from "@erasure/crypto-ipfs";

import NMR from "../erasure/NMR";
import ErasureEscrow from "../erasure/ErasureEscrow";

import Abi from "../utils/Abi";
import Box from "../utils/3Box";
import IPFS from "../utils/IPFS";
import Crypto from "../utils/Crypto";
import Ethers from "../utils/Ethers";

import contract from "../../artifacts/CountdownGriefingEscrow_Factory.json";

class Escrow_Factory {
  #nmr = null;
  #receipt = null;
  #registry = null;
  #network = null;
  #contract = null;
  #protocolVersion = "";

  constructor({ registry, network, protocolVersion }) {
    this.#network = network;
    this.#protocolVersion = protocolVersion;

    this.#nmr = new NMR({ registry, network, protocolVersion });

    if (process.env.NODE_ENV === "test") {
      this.#registry = registry.CountdownGriefingEscrow_Factory;
      this.#contract = new ethers.Contract(
        this.#registry,
        contract.abi,
        Ethers.getWallet()
      );
    } else {
      this.#registry = Object.keys(registry).reduce((p, c) => {
        p[c] = registry[c].CountdownGriefingEscrow_Factory;
        return p;
      }, {});

      this.#contract = new ethers.Contract(
        this.#registry[this.#network],
        contract.abi,
        Ethers.getWallet()
      );
    }

    // Listen for any metamask changes.
    if (typeof window !== "undefined" && window.ethereum !== undefined) {
      window.ethereum.on("accountsChanged", function() {
        if (process.env.NODE_ENV === "test") {
          this.#contract = new ethers.Contract(
            this.#registry,
            contract.abi,
            Ethers.getWallet()
          );
        } else {
          this.#contract = new ethers.Contract(
            this.#registry[this.#network],
            contract.abi,
            Ethers.getWallet()
          );
        }
      });
    }
  }

  address = () => {
    return this.#contract.address;
  };

  /**
   * Create a new escrow
   *
   * @param {Object} config
   * @param {string} config.operator
   * @param {string} config.buyer
   * @param {string} config.seller
   * @param {string} config.paymentAmount
   * @param {string} config.stakeAmount
   * @param {string} config.escrowCountdown
   * @param {string} config.greifRatio
   * @param {string} config.greifRatioType
   * @param {string} config.agreementCountdown
   * @param {string} config.metadata
   * @returns {Promise<EscrowWithReceipt>}
   */
  create = async ({
    operator,
    buyer,
    seller,
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
      const staticMetadata = CryptoIPFS.ipfs.hashToHex(staticMetadataB58);

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
          Ethers.parseEther(paymentAmount),
          Ethers.parseEther(stakeAmount),
          escrowCountdown,
          staticMetadata,
          agreementParams
        ]
      );

      // Creates the contract.
      const tx = await this.#contract.create(callData);
      const receipt = await tx.wait();

      return {
        receipt,
        escrow: new ErasureEscrow({
          buyer,
          seller,
          stakeAmount,
          paymentAmount,
          nmr: this.#nmr,
          escrowAddress: receipt.logs[0].address,
          protocolVersion: this.#protocolVersion
        })
      };
    } catch (err) {
      throw err;
    }
  };

  createClone = ({
    escrowAddress,
    buyer,
    seller,
    stakeAmount,
    paymentAmount
  }) => {
    return new ErasureEscrow({
      escrowAddress,
      buyer,
      seller,
      stakeAmount,
      paymentAmount,
      nmr: this.#nmr,
      protocolVersion: this.#protocolVersion
    });
  };

  decodeParams = data => {
    const result = Abi.decode(
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
      data
    );

    const agreementParams = Abi.decode(
      ["uint256", "uint8", "uint256"],
      result[7]
    );

    return {
      operator: Ethers.getAddress(result[0]),
      buyer: Ethers.getAddress(result[1]),
      seller: Ethers.getAddress(result[2]),
      paymentAmount: Ethers.formatEther(result[3]).toString(),
      stakeAmount: Ethers.formatEther(result[4]).toString(),
      escrowCountdown: Ethers.formatEther(result[5].toString()),
      staticMetadataB58: IPFS.hexToHash(result[6]),
      agreementParams: {
        griefRatio: Ethers.formatEther(agreementParams[0]).toString(),
        griefRatioType: agreementParams[1],
        agreementCountdown: agreementParams[2]
      }
    };
  };
}

export default Escrow_Factory;
