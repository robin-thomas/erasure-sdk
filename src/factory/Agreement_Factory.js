import { ethers } from "ethers";
import CryptoIPFS from "@erasure/crypto-ipfs";

import Abi from "../utils/Abi";
import IPFS from "../utils/IPFS";
import Utils from "../utils/Utils";
import Ethers from "../utils/Ethers";

import NMR from "../erasure/NMR";
import ErasureAgreement from "../erasure/ErasureAgreement";

import simpleContract from "../../artifacts/SimpleGriefing_Factory.json";
import countdownContract from "../../artifacts/CountdownGriefing_Factory.json";

class Agreement_Factory {
  #nmr = null;
  #registry = {};
  #network = null;
  #contract = null;
  #protocolVersion = "";

  constructor({ registry, network, protocolVersion }) {
    this.#network = network;
    this.#protocolVersion = protocolVersion;

    this.#nmr = new NMR({ registry, network, protocolVersion });

    if (process.env.NODE_ENV === "test") {
      this.#registry = {
        SimpleGriefing_Factory: registry.SimpleGriefing_Factory,
        CountdownGriefing_Factory: registry.CountdownGriefing_Factory
      };
    } else {
      this.#registry = Object.keys(registry).reduce((p, c) => {
        p[c].SimpleGriefing_Factory = registry[c].SimpleGriefing_Factory;
        p[c].CountdownGriefing_Factory = registry[c].CountdownGriefing_Factory;
        return p;
      }, {});
    }

    // Listen for any metamask changes.
    if (typeof window !== "undefined" && window.ethereum !== undefined) {
      window.ethereum.on("networkChanged", function(networkId) {
        this.#network = Ethers.getNetworkName(networkId);
      });
    }
  }

  create = async ({
    operator,
    staker,
    counterparty,
    griefRatio,
    griefRatioType,
    countdownLength,
    metadata
  }) => {
    let abi, agreementType;
    if (countdownLength !== undefined) {
      abi = countdownContract.abi;
      agreementType = "CountdownGriefing_Factory";
    } else {
      abi = simpleContract.abi;
      agreementType = "SimpleGriefing_Factory";
    }

    let address;
    if (process.env.NODE_ENV === "test") {
      address = this.#registry[agreementType];
    } else {
      address = this.#registry[this.#network][agreementType];
    }
    const contract = new ethers.Contract(address, abi, Ethers.getWallet());

    const ipfsHash = await IPFS.add(metadata);
    const staticMetadata = CryptoIPFS.ipfs.hashToHex(ipfsHash);

    const callData = Abi.encodeWithSelector(
      "initialize",
      [
        "address",
        "address",
        "address",
        "uint256",
        "uint8",
        ...(countdownLength !== undefined ? ["uint256"] : []),
        "bytes"
      ],
      [
        operator,
        staker,
        counterparty,
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
      const network = await Ethers.getProvider().getNetwork();
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
      protocolVersion: this.#protocolVersion
    });
  };

  decodeParams = data => {
    const result = Abi.decode(
      ["address", "address", "address", "uint256", "uint8", "uint256", "bytes"],
      data
    );

    return {
      operator: result[0],
      staker: result[1],
      counterparty: result[2],
      griefRatio: Ethers.formatEther(result[3].toString()),
      griefRatioType: result[4],
      countdownLength: result[5].toNumber(),
      metadata: Utils.hexToHash(result[6])
    };
  };
}

export default Agreement_Factory;
