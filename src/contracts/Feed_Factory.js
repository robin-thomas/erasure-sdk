import CryptoIPFS from "@erasure/crypto-ipfs";

import Web3 from "../utils/Web3";
import IPFS from "../utils/IPFS";
import Contract from "../utils/Contract";

import contract from "../../artifacts/Feed_Factory.json";

class Feed_Factory {
  constructor({ network, web3 }) {
    this.web3 = web3;
    this.network = network;

    this.contract = new Contract({
      network,
      web3,
      abi: contract.abi,
      contract: "Feed_Factory"
    });
  }

  async createExplicit({ hash, data = null }) {
    try {
      const accounts = await this.web3.eth.getAccounts();
      const operator = accounts[0];

      const postRegistry = Contract.getAddress("Erasure_Posts", this.network);
      if (!this.web3.utils.isAddress(postRegistry)) {
        throw new Error(`PostRegistry ${postRegistry} is not an address`);
      }

      // Convert the ipfs hash to multihash hex code.
      let ipfsHash = hash;
      if (data) {
        ipfsHash = await IPFS.upload(data);
      }
      const feedStaticMetadata = CryptoIPFS.ipfs.hashToHex(ipfsHash);
      console.log(
        `Uploaded to IPFS: hash = ${ipfsHash}, hex = ${feedStaticMetadata}`
      );

      // Creates a contract.
      const txHash = await this.contract.invokeFn(
        "createExplicit",
        true,
        operator,
        postRegistry,
        feedStaticMetadata
      );

      // Get the address of the newly created address.
      const txReceipt = await Web3.getTxReceipt(this.web3, txHash);

      return {
        hash: ipfsHash,
        address: txReceipt.logs[0].address
      };
    } catch (err) {
      throw err;
    }
  }
}

export default Feed_Factory;
