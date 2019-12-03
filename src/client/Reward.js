import Ethers from "../utils/Ethers";
import Griefing from "../utils/Griefing";

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
    const { griefingType } = await Griefing.getMetadata(griefingAddress);
    this.setGriefing(griefingType, griefingAddress);

    return await this.griefing.increaseStake(Ethers.parseEther(rewardAmount));
  } catch (err) {
    throw err;
  }
};

export default Reward;
