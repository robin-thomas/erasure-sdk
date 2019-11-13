import CryptoIPFS from "@erasure/crypto-ipfs";

import Web3 from "../utils/Web3";
import Contract from "../utils/Contract";

class Feed {
  constructor({ network, web3 }) {
    this.web3 = web3;
    this.contract = new Contract({ network, web3, contract });
  }
}

export default Feed;
