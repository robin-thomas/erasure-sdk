import Ethers from "../utils/Ethers";

/**
 * Reward a user
 *
 * @param {Object} config - configuration for reward
 * @param {string} config.rewardAmount - amount to be rewarded
 * @param {string} config.griefingAddress - contract address of the griefing agreement
 * @returns {Promise} transaction receipts of staking
 */
const Reward = async function({ rewardAmount, griefingAddress }) {
  try {
    const griefing = this.datastore.griefing.griefing[griefingAddress];
    let currentStake = griefing.currentStake;

    currentStake = Ethers.parseEther(currentStake);
    rewardAmount = Ethers.parseEther(rewardAmount);

    const stake = await this.countdownGriefing.increaseStake(
      currentStake,
      rewardAmount
    );

    this.datastore.griefing.griefing[
      griefingAddress
    ].currentStake = Ethers.formatEther(
      currentStake.add(rewardAmount)
    ).toString();

    return stake;
  } catch (err) {
    throw err;
  }
};

export default Reward;
