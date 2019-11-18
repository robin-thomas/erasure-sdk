import Ethers from "../utils/Ethers";

/**
 * Reward a user
 *
 * @param {Object} config - configuration for reward
 * @param {string} config.punishment - amount to be punished
 * @param {string} config.griefingAddress - contract address of the griefing agreement
 * @param {string} config.message - message
 * @returns {Promise} transaction receipts of staking
 */
const Punish = async function({ amountToAdd, griefingAddress, message }) {
  try {
    const griefing = this.datastore.griefing.griefing[griefingAddress];

    const ratio = griefing.ratio;
    let currentStake = griefing.currentStake;

    punishment = Ethers.bigNumberify(punishment);
    currentStake = Ethers.bigNumberify(currentStake);

    const expectedCost = punishment.muln(ratio);

    const stake = await this.countdownGriefing.punish(
      currentStake,
      punishment,
      Buffer.from(message)
    );

    this.datastore.griefing.griefing[
      griefingAddress
    ].currentStake = currentStake.sub(punishment).toString();

    return stake;
  } catch (err) {
    throw err;
  }
};

export default Punish;
