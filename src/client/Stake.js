import Box from "../utils/3Box";
import Ethers from "../utils/Ethers";

/**
 * Stake your feed
 *
 * @param {Object} config - configuration for staking
 * @param {string} config.stakeAmount - amount to be staked
 * @param {string} config.counterParty - party with whom the agreement to be made
 * @param {number} config.countdownLength - duration of the agreement in seconds
 * @param {string} [config.ratio] - griefing ratio
 * @param {number} [config.ratioType] - griefing ratio type
 * @returns {Promise} transaction receipts of griefing, approval and staking
 */
const Stake = async function({
  stakeAmount,
  counterParty,
  countdownLength,
  ratio,
  ratioType
}) {
  try {
    let data = null;
    const hash = (await Box.get(Box.DATASTORE_GRIEFING)).ipfsHash;
    if (hash === null || hash === undefined) {
      data = JSON.stringify(
        {
          ErasureAgreement: this.version
        },
        null,
        4
      );
    }

    let opts = {
      ratio,
      ratioType,
      counterParty,
      countdownLength,
      hash,
      data
    };

    // Create griefing agreement.
    const griefing = await this.countdownGriefingFactory.create(opts);
    this.countdownGriefing.setAddress(griefing.address);

    await Box.set(Box.DATASTORE_GRIEFING, griefing);

    let griefingData = {};
    griefingData[griefing.address] = {
      currentStake: "0",
      ratio,
      ratioType,
      counterParty,
      countdownLength
    };

    // Mint some mock NMR for test purposes.
    if (process.env.NODE_ENV === "test") {
      await this.nmr.mintMockTokens(counterParty, Ethers.parseEther("1000"));
    }

    // Approve and stake NMR.
    const approval = await this.nmr.changeApproval(griefing.address);
    stakeAmount = Ethers.parseEther(stakeAmount);
    const stake = await this.countdownGriefing.increaseStake("0", stakeAmount);

    griefingData[griefing.address].currentStake = Ethers.formatEther(
      stakeAmount
    ).toString();
    await Box.set(Box.DATASTORE_GRIEFINGS, griefingData);

    return {
      griefing,
      approval,
      stake
    };
  } catch (err) {
    throw err;
  }
};

export default Stake;
