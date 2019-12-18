import { ethers } from "ethers";
import CryptoIPFS from "@erasure/crypto-ipfs";

import ErasureFeed from "../erasure/ErasureFeed";

import Abi from "../utils/Abi";
import Box from "../utils/3Box";
import IPFS from "../utils/IPFS";
import Utils from "../utils/Utils";
import Crypto from "../utils/Crypto";
import Ethers from "../utils/Ethers";

import contract from "../../artifacts/Feed_Factory.json";

class Feed_Factory {
  #receipt = null;
  #registry = null;
  #network = null;
  #contract = null;
  #escrowFactory = null;
  #web3Provider = null;
  #protocolVersion = "";

  constructor({
    registry,
    network,
    web3Provider,
    protocolVersion,
    escrowFactory
  }) {
    this.#network = network;
    this.#escrowFactory = escrowFactory;
    this.#protocolVersion = protocolVersion;

    this.#web3Provider = web3Provider ? web3Provider : Ethers.getProvider();

    if (process.env.NODE_ENV === "test") {
      this.#registry = registry.Feed_Factory;
      this.#contract = new ethers.Contract(
        this.#registry,
        contract.abi,
        Ethers.getWallet(this.#web3Provider)
      );
    } else {
      this.#registry = Object.keys(registry).reduce((p, c) => {
        p[c] = registry[c].Feed_Factory;
        return p;
      }, {});

      this.#contract = new ethers.Contract(
        this.#registry[this.#network],
        contract.abi,
        Ethers.getWallet(this.#web3Provider)
      );
    }

    // Listen for any metamask changes.
    if (typeof window !== "undefined" && window.ethereum !== undefined) {
      window.ethereum.on("accountsChanged", function() {
        if (process.env.NODE_ENV === "test") {
          this.#contract = new ethers.Contract(
            this.#registry,
            contract.abi,
            Ethers.getWallet(this.#web3Provider)
          );
        } else {
          this.#contract = new ethers.Contract(
            this.#registry[this.#network],
            contract.abi,
            Ethers.getWallet(this.#web3Provider)
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
      const proofHash = Utils.hexToSha256(staticMetadata);

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
          web3Provider: this.#web3Provider,
          feedAddress: receipt.logs[0].address,
          escrowFactory: this.#escrowFactory,
          protocolVersion: this.#protocolVersion
        })
      };
    } catch (err) {
      throw err;
    }
  };

  createClone = async address => {
    const logs = await this.#web3Provider.getLogs({
      address,
      fromBlock: 0,
      topics: [ethers.utils.id("OperatorUpdated(address)")]
    });
    const owner = Ethers.getAddress(logs[logs.length - 1].data);

    return new ErasureFeed({
      owner,
      feedAddress: address,
      web3Provider: this.#web3Provider,
      escrowFactory: this.#escrowFactory,
      protocolVersion: this.#protocolVersion
    });
  };

  getFeeds = async (user = null) => {
    try {
      const results = await this.#web3Provider.getLogs({
        address: this.#contract.address,
        topics: [ethers.utils.id("InstanceCreated(address,address,bytes)")],
        fromBlock: 0
      });

      let feeds = [];
      if (results && results.length > 0) {
        const abiCoder = ethers.utils.defaultAbiCoder;

        for (const result of results) {
          const data = abiCoder.decode(["bytes"], result.data)[0];
          const callData = Abi.decodeWithSelector(
            "initialize",
            ["address", "bytes32", "bytes"],
            data
          );

          const owner = Ethers.getAddress(result.topics[2]);
          const feedAddress = Ethers.getAddress(result.topics[1]);

          if (user !== null && owner !== Ethers.getAddress(user)) {
            continue;
          }

          feeds.push(
            new ErasureFeed({
              owner,
              feedAddress,
              web3Provider: this.#web3Provider,
              escrowFactory: this.#escrowFactory,
              protocolVersion: this.#protocolVersion
            })
          );
        }
      }

      return feeds;
    } catch (err) {
      throw err;
    }
  };
}

export default Feed_Factory;
