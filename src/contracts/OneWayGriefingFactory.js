import CryptoIPFS from "@erasure/crypto-ipfs";

import Web3 from "../utils/Web3";
import Contract from "../utils/Contract";

import contract from "../../artifacts/OneWayGriefing_Factory.json";

class OneWayGriefingFactory {
  constructor({ network, web3 }) {
    this.web3 = web3;
    this.network = network;

    this.contract = new Contract({
      network,
      web3,
      abi: contract.abi,
      address: "OneWayGriefing_Factory"
    });
  }

  async createExplicit(counterParty, countdownLength, ipfsHash) {
    try {
      const accounts = await this.web3.eth.getAccounts();
      const operator = accounts[0];
      const staker = operator;

      if (!this.web3.utils.isAddress(counterParty)) {
        throw new Error(`CounterParty ${counterParty} is not an address`);
      }

      const token = Contract.getAddress("NMR", this.network);
      if (!this.web3.utils.isAddress(token)) {
        throw new Error(`Token ${token} is not an address`);
      }

      // Convert the ipfs hash to multihash hex code.
      const staticMetadata = CryptoIPFS.ipfs.hashToHex(ipfsHash);

      await this.contract.invokeFn(
        "createExplicit",
        true,
        token,
        operator,
        staker,
        counterparty,
        ratio,
        ratioType,
        countdownLength,
        staticMetadata
      );
    } catch (err) {
      throw err;
    }
  }

  async increaseStake(stakedAmount /* in NMR */) {
    if (typeof stakedAmount !== "string" && !(stakedAmount instanceof String)) {
      stakedAmount = stakedAmount.toString();
    }

    const stake = web3.utils.toHex(web3.utils.toWei(stakedAmount, "ether"));

    await this.contract.invokeFn("createExplicit", true, 0, stake);
  }
}

export default OneWayGriefingFactory;
