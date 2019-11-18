import Box from "../utils/3Box";
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
    let griefingData = await Box.get(Box.DATASTORE_GRIEFINGS);
    if (griefingData === null) {
      griefingData = {};
    }
    if (griefingData[griefingAddress] === undefined) {
      griefingData[griefingAddress] = {
        currentStake: "0"
      };
    }

    let currentStake = griefingData[griefingAddress].currentStake;
    currentStake = Ethers.parseEther(currentStake);
    rewardAmount = Ethers.parseEther(rewardAmount);

    const stake = await this.countdownGriefing.increaseStake(
      currentStake,
      rewardAmount
    );

    griefingData[griefingAddress].currentStake = Ethers.formatEther(
      currentStake.add(rewardAmount)
    ).toString();

    await Box.set(Box.DATASTORE_GRIEFINGS, griefingData);

    return stake;
  } catch (err) {
    throw err;
  }
};

export default Reward;
