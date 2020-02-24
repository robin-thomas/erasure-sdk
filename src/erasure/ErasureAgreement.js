import { ethers } from "ethers";
import BigNumber from "bignumber.js";

import Abi from "../utils/Abi";
import IPFS from "../utils/IPFS";
import Crypto from "../utils/Crypto";
import Ethers from "../utils/Ethers";
import Config from "../utils/Config";
import ESP_1001 from "../utils/ESP_1001";
import Contract from "../utils/Contract";

import ErasurePost from "./ErasurePost";

class ErasureAgreement {
  #abi = null;
  #type = "";
  #tokenWrapper = null;
  #tokenID = null;
  #staker = null;
  #contract = null;
  #griefRatio = null;
  #ratioType = null;
  #counterparty = null;
  #agreementAddress = null;
  #creationReceipt = null;
  #encodedMetadata = null;

  /**
   * @param {Object} config
   * @param {('simple'|'countdown')} config.type
   * @param {address} config.staker
   * @param {address} config.counterparty
   * @param {address} config.agreementAddress
   * @param {Object} config.creationReceipt
   * @param {string} [config.encodedMetadata]
   */
  constructor({
    type,
    token,
    agreementAddress,
    creationReceipt,
    encodedMetadata,
  }) {
    this.#type = type;
    this.#contract = Contract.contract(
      type === "countdown" ? "CountdownGriefing" : "SimpleGriefing",
      agreementAddress,
    );
    this.#agreementAddress = agreementAddress;
    this.#creationReceipt = creationReceipt;
    this.#encodedMetadata = encodedMetadata;
    this.#tokenWrapper = token;
  }

  /**
   * Access the web3 contract class
   *
   * @memberof ErasureAgreement
   * @method contract
   * @returns {Object} contract object
   */
  contract = () => {
    return this.#contract;
  };

  /**
   * Get the address of this agreement
   *
   * @memberof ErasureAgreement
   * @method address
   * @returns {address} address of the agreement
   */
  address = () => {
    return this.#agreementAddress;
  };

  /**
   * Get the creationReceipt of this agreement
   *
   * @memberof ErasureAgreement
   * @method creationReceipt
   * @returns {Object}
   */
  creationReceipt = () => {
    return this.#creationReceipt;
  };

  /**
   * Get the creation timestamp of this agreement
   *
   * @memberof ErasureAgreement
   * @method getCreationTimestamp
   * @returns {integer}
   */
  getCreationTimestamp = async () => {
    const block = await Config.store.ethersProvider.getBlock(
      this.#creationReceipt.blockNumber,
    );
    return block.timestamp;
  };

  /**
   *
   * Get the type of this agreement (simple | countdown)
   *
   * @memberof ErasureAgreement
   * @method type
   * @returns {('simple'|'countdown')} type of the agreement
   */
  type = () => {
    return this.#type;
  };

  /**
   *
   * Get the address of the staker of this agreement
   *
   * @memberof ErasureAgreement
   * @method staker
   * @returns {address} address of the staker
   */
  staker = async () => {
    if (!this.#staker) {
      this.#staker = await this.contract().getStaker();
    }
    return this.#staker;
  };

  /**
   * Get the address of the counterparty of this agreement
   *
   * @memberof ErasureAgreement
   * @method counterparty
   * @returns {address} address of the counterparty
   */
  counterparty = async () => {
    if (!this.#counterparty) {
      this.#counterparty = await this.contract().getCounterparty();
    }
    return this.#counterparty;
  };

  /**
   * Get the griefRatio of this agreement
   *
   * @memberof ErasureAgreement
   * @method griefRatio
   * @returns {string} griefRatio
   */
  griefRatio = async () => {
    if (!this.#griefRatio) {
      const { ratio, ratioType } = await this.contract().getRatio(
        await this.staker(),
      );
      this.#griefRatio = ethers.utils.formatEther(ratio);
    }
    console.log("griefRatio", this.#griefRatio);
    return this.#griefRatio;
  };

  /**
   * Get the ratioType of this agreement
   *
   * @memberof ErasureAgreement
   * @method ratioType
   * @returns {string} ratioType
   */
  ratioType = async () => {
    if (!this.#ratioType) {
      const { ratio, ratioType } = await this.contract().getRatio(
        await this.staker(),
      );
      this.#ratioType = ratioType;
    }
    console.log("ratioType", this.#ratioType);
    return this.#ratioType;
  };

  /**
   * Get the tokenID
   *
   * @memberof ErasureAgreement
   * @method tokenID
   * @returns {integer} tokenID
   */
  tokenID = async () => {
    if (!this.#tokenID) {
      const res = await this.contract().getToken();
      this.#tokenID = res.tokenID;
    }
    return this.#tokenID;
  };

  /**
   * Get the metadata of this agreement
   *
   * @memberof ErasureAgreement
   * @method metadata
   * @returns {object} metadata
   */
  metadata = async () => {
    if (this.#encodedMetadata !== "0x") {
      return await ESP_1001.decodeMetadata(this.#encodedMetadata);
    } else {
      return this.#encodedMetadata;
    }
  };

  /**
   * Get array of punishments of this agreement
   *
   * @memberof ErasureAgreement
   * @method getPunishments
   * @returns {array}
   */
  getPunishments = async () => {
    const abi = [
      "event Griefed(address punisher, address staker, uint256 punishment, uint256 cost, bytes message)",
    ];
    const iface = new ethers.utils.Interface(abi);
    const logs = await Config.store.ethersProvider.getLogs({
      address: this.address(),
      topics: [iface.events.Griefed.topic],
      fromBlock: 0,
    });
    const parsedLogs = logs.map(log => iface.parseLog(log));

    return parsedLogs;
  };

  /**
   * Called by staker to increase the stake
   *
   * @memberof ErasureAgreement
   * @method stake
   * @param {string} amount - amount by which to increase the stake
   * @returns {Promise} transaction receipt
   */
  stake = async amount => {
    const user = await Ethers.getAccount(Config.store.ethersProvider);
    if (Ethers.getAddress(user) !== Ethers.getAddress(await this.staker())) {
      throw new Error(
        `stake() can be called only by staker: ${await this.staker()}`,
      );
    }

    const stakeAmount = Ethers.parseEther(amount);
    await this.#tokenWrapper.approve(
      await this.tokenID(),
      this.address(),
      stakeAmount,
    );

    const tx = await this.contract().increaseStake(stakeAmount);
    return await tx.wait();
  };

  /**
   * Called by counterparty to increase the stake
   *
   * @memberof ErasureAgreement
   * @method reward
   * @param {string} amount - amount by which to increase the stake (in NMR)
   * @returns {Promise} transaction receipt
   */
  reward = async amount => {
    const user = await Ethers.getAccount(Config.store.ethersProvider);
    if (
      Ethers.getAddress(user) !== Ethers.getAddress(await this.counterparty())
    ) {
      throw new Error(
        `reward() can be called only by counterparty: ${await this.counterparty()}`,
      );
    }

    const rewardAmount = Ethers.parseEther(amount);
    await this.#tokenWrapper.approve(
      await this.tokenID(),
      this.address(),
      rewardAmount,
    );

    const tx = await this.contract().increaseStake(rewardAmount);
    return await tx.wait();
  };

  /**
   * Called by counterparty to burn some stake
   *
   * @memberof ErasureAgreement
   * @method punish
   * @param {string} amount - punishment amount to burn from the stake (in NMR)
   * @param {string} message - message to indicate reason for the punishment
   * @returns {Promise} amount it cost to punish
   * @returns {Promise} transaction receipt
   */
  punish = async (amount, message) => {
    const user = await Ethers.getAccount(Config.store.ethersProvider);
    if (
      Ethers.getAddress(user) !== Ethers.getAddress(await this.counterparty())
    ) {
      throw new Error(
        `punish() can be called only by counterparty: ${await this.counterparty()}`,
      );
    }

    console.log('amount', amount)
    console.log('message', message)

    const punishAmount = Ethers.parseEther(amount);
    const expectedCost = await this.contract().getCost(
      await this.griefRatio(),
      punishAmount,
      await this.ratioType(),
    );
    console.log("expectedCost", expectedCost);
    await this.#tokenWrapper.approve(
      await this.tokenID(),
      this.address(),
      ethers.utils.bigNumberify(expectedCost),
    );

    const tx = await this.contract().punish(punishAmount, Buffer.from(message));
    const receipt = await tx.wait();

    const events = receipt.events.reduce((p, c) => {
      p[c.event] = c;
      return p;
    }, {});

    const cost = Ethers.formatEther(
      Abi.decode(
        ["address", "address", "uint256", "uint256", "bytes"],
        events.Griefed.data,
      )[3],
    );

    return {
      cost,
      receipt,
    };
  };

  /**
   * Called by counterparty to release the stake
   *
   * @memberof ErasureAgreement
   * @method release
   * @param {string} amount - amount to release from the stake (in NMR)
   * @returns {Promise} transaction receipt
   */
  release = async amount => {
    const tx = await this.contract().releaseStake(Ethers.parseEther(amount));
    return await tx.wait();
  };

  /**
   * Called by staker to start the countdown to withdraw the stake
   *
   * @memberof ErasureAgreement
   * @method requestWithdraw
   * @returns {Promise} deadline timestamp when withdraw will be available
   * @returns {Promise} transaction receipts
   */
  requestWithdraw = async () => {
    const user = await Ethers.getAccount(Config.store.ethersProvider);
    if (Ethers.getAddress(user) !== Ethers.getAddress(await this.staker())) {
      throw new Error(
        `requestWithdraw() can be called only by staker: ${await this.staker()}`,
      );
    }

    const tx = await this.contract().startCountdown();
    const receipt = await tx.wait();

    const events = receipt.events.reduce((p, c) => {
      p[c.event] = c;
      return p;
    }, {});

    const deadline = Ethers.formatEther(
      Abi.decode(["uint256"], events.DeadlineSet.data)[0],
    );

    return {
      receipt,
      deadline,
    };
  };

  /**
   * Called by staker to withdraw the stake
   *
   * @memberof ErasureAgreement
   * @method withdraw
   * @param {address} recipient
   * @returns {Promise} amount withdrawn
   * @returns {Promise} transaction receipt
   */
  withdraw = async recipient => {
    if (this.type() !== "countdown") {
      throw new Error("'withdraw' is supported only for countdown agreement");
    }

    const tx = await this.contract().retrieveStake(recipient);
    const receipt = await tx.wait();

    const events = receipt.events.reduce((p, c) => {
      p[c.event] = c;
      return p;
    }, {});

    const amountWithdrawn = Ethers.formatEther(
      Abi.decode(
        ["uint8", "address", "uint256", "uint256"],
        events.DepositDecreased.data,
      )[2],
    );

    return {
      receipt,
      amountWithdrawn,
    };
  };

  /**
   * Get the status of the agreement
   *
   * @memberof ErasureAgreement
   * @method checkStatus
   * @returns {Promise} object with all relevant data
   */
  checkStatus = async () => {
    return await this.contract().getAgreementStatus();
  };

  /**
   * Get the state data of the agreement
   *
   * @memberof ErasureAgreement
   * @method getData
   * @returns {Promise} object with all relevant data
   */
  getData = async () => {
    const type = this.type();
    const operator = await this.contract().getOperator();
    const staker = await this.contract().getStaker();
    const counterparty = await this.contract().getCounterparty();
    const tokenID = (await this.contract().getToken()).tokenID;
    const currentStake = ethers.utils.formatEther(
      await this.contract().getStake(),
    );
    const { ratio, ratioType } = await this.contract().getRatio(staker);
    const agreementStatus = await this.contract().getAgreementStatus();
    const metadata = await this.metadata();

    let agreementLength;
    let agreementDeadline;
    let countdownStatus;

    if (type === "countdown") {
      agreementLength = await this.contract().getLength();
      agreementDeadline = await this.contract().getDeadline();
      countdownStatus = await this.contract().getCountdownStatus();
    }

    return {
      operator,
      staker,
      counterparty,
      tokenID,
      currentStake,
      ratio: ethers.utils.formatEther(ratio),
      ratioType,
      agreementLength,
      agreementDeadline,
      agreementStatus,
      countdownStatus,
      metadata,
    };
  };
}

export default ErasureAgreement;
