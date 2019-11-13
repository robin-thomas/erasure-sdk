import CryptoIPFS from "@erasure/crypto-ipfs";

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

  setAddress(address) {
    this.contract = this.contract.setContract(contract.abi, address);
  }

  async createPost(data) {
    const postFactory = Contract.getAddress("Post_Factory", this.network);
    if (!this.web3.utils.isAddress(postRegistry)) {
      throw new Error(`PostFactory ${postFactory} is not an address`);
    }

    // Creates a contract.
    const txHash = await this.contract.invokeFn(
      "createPost",
      true,
      postFactory,
      data
    );

    // Get the address of the newly created address.
    const txReceipt = await Web3.getTxReceipt(this.web3, txHash);
    return txReceipt.logs[0].address;
  }
}

export default Feed;
