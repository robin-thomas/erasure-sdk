import CryptoIPFS from "@erasure/crypto-ipfs";

import Web3 from "../utils/Web3";
import Contract from "../utils/Contract";

import contract from "../../artifacts/Feed.json";

class Feed {
  constructor({ network, web3 }) {
    this.web3 = web3;

    this.contract = new Contract({
      network,
      web3,
      abi: contract.abi,
      contract: "Feed"
    });
  }
}

export default Feed;
