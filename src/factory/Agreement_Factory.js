import { ethers } from "ethers";
import { constants } from "@erasure/crypto-ipfs";

import Abi from "../utils/Abi";
import IPFS from "../utils/IPFS";
import Utils from "../utils/Utils";
import Ethers from "../utils/Ethers";

import ErasureAgreement from "../erasure/ErasureAgreement";

import { abi as simpleContractAbi } from "../../artifacts/SimpleGriefing_Factory.json";
import { abi as countdownContractAbi } from "../../artifacts/CountdownGriefing_Factory.json";

class Agreement_Factory {
  #nmr = null;
  #registry = {};
  #network = null;
  #contract = null;
  #ethersProvider = null;
  #protocolVersion = "";

  constructor({ nmr, registry, network, ethersProvider, protocolVersion }) {
    this.#nmr = nmr;
    this.#network = network;
    this.#ethersProvider = Ethers.getProvider(null, ethersProvider);
    this.#protocolVersion = protocolVersion;

    if (process.env.NODE_ENV === "test") {
      this.#registry = {
        SimpleGriefing_Factory: registry.SimpleGriefing_Factory,
        CountdownGriefing_Factory: registry.CountdownGriefing_Factory
      };
    } else {
      this.#registry = Object.keys(registry).reduce((p, c) => {
        if (p[c] === undefined) {
          p[c] = {};
        }

        p[c].SimpleGriefing_Factory = registry[c].SimpleGriefing_Factory;
        p[c].CountdownGriefing_Factory = registry[c].CountdownGriefing_Factory;
        return p;
      }, {});
    }
  }

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
      address = this.#registry[this.#network][agreementType];
    }
    const contract = new ethers.Contract(
      address,
      abi,
      Ethers.getWallet(this.#ethersProvider)
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
    const receipt = await tx.wait();

    // Mint some mock NMR for test purposes.
    if (process.env.NODE_ENV === "test") {
      await this.#nmr.mintMockTokens(operator, Ethers.parseEther("1000"));
    } else {
      const network = await this.#ethersProvider.getNetwork();
      if (network && network.name === "rinkeby") {
        await this.#nmr.mintMockTokens(operator, Ethers.parseEther("1000"));
        await this.#nmr.mintMockTokens(counterparty, Ethers.parseEther("1000"));
      }
    }

    await this.#nmr.changeApproval(receipt.logs[0].address);

    return {
      receipt,
      agreement: new ErasureAgreement({
        staker,
        counterparty,
        ethersProvider: this.#ethersProvider,
        type:
          agreementType === "CountdownGriefing_Factory"
            ? "countdown"
            : "simple",
        protocolVersion: this.#protocolVersion,
        agreementAddress: receipt.logs[0].address
      })
    };
  };

  createClone = (agreementAddress, type, staker, counterparty) => {
    return new ErasureAgreement({
      staker,
      counterparty,
      type,
      agreementAddress,
      ethersProvider: this.#ethersProvider,
      protocolVersion: this.#protocolVersion
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
