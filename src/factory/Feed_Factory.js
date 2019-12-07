import { ethers } from "ethers";
import CryptoIPFS from "@erasure/crypto-ipfs";

import ErasureFeed from "../erasure/ErasureFeed";

import Abi from "../utils/Abi";
import Box from "../utils/3Box";
import IPFS from "../utils/IPFS";
import Crypto from "../utils/Crypto";
import Ethers from "../utils/Ethers";

import contract from "../../artifacts/Feed_Factory.json";

class Feed_Factory {
  #receipt = null;
  #registry = null;
  #network = null;
  #contract = null;
  #protocolVersion = "";

  constructor({ receipt, registry, network, protocolVersion }) {
    this.#receipt = receipt;
    this.#network = network;
    this.#protocolVersion = protocolVersion;

    if (process.env.NODE_ENV === "test") {
      this.#registry = registry.Feed_Factory;
      this.#contract = new ethers.Contract(
        this.#registry,
        contract.abi,
        Ethers.getWallet()
      );
    } else {
      this.#registry = Object.keys(registry).reduce((p, c) => {
        p[c] = registry[c].Feed_Factory;
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

  /**
   * Create a Feed contract using Feed_Factory
   *
   * @param {address} operator
   * @param {string} metadata
   * @returns {Promise<Feed>}
   */
  create = async ({ operator, metadata }) => {
    try {
      // Convert the ipfs hash to multihash hex code.
      const staticMetadataB58 = await IPFS.add(metadata);
      const staticMetadata = CryptoIPFS.ipfs.hashToHex(staticMetadataB58);
      const proofHash = IPFS.hexToSha256(staticMetadata);

      const callData = Abi.encodeWithSelector(
        "initialize",
        ["address", "bytes32", "bytes"],
        [operator, proofHash, staticMetadata]
      );

      // Creates the contract.
      const tx = await this.#contract.create(callData);
      const receipt = await tx.wait();

      return {
        receipt,
        feed: new ErasureFeed({
          owner: operator,
          feedAddress: receipt.logs[0].address,
          protocolVersion: this.#protocolVersion
        })
      };
    } catch (err) {
      throw err;
    }
  };
}

export default Feed_Factory;
