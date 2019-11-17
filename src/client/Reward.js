/**
 * Reward a user
 *
 * @param {Object} config - configuration for reward
 * @param {string} config.amountToAdd - amount to be rewarded
 * @param {string} config.griefingAddress - contract address of the griefing agreement
 * @returns {Promise} transaction receipts of staking
 */
const Reward = async function({ amountToAdd, griefingAddress }) {
  try {
    const currentStake = this.datastore.griefing.griefing[griefingAddress]
      .currentStake;

    const stake = await this.countdownGriefing.increaseStake(
      currentStake,
      amountToAdd
    );

    this.datastore.griefing.griefing[
      griefingAddress
    ].currentStake = amountToAdd;

    return stake;
  } catch (err) {
    throw err;
  }
};

export default Reward;
