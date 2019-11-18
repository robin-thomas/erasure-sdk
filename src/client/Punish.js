import Box from "../utils/3Box";
import Ethers from "../utils/Ethers";

/**
 * Reward a user
 *
 * @param {Object} config - configuration for reward
 * @param {string} config.punishAmount - amount to be punished
 * @param {string} config.griefingAddress - contract address of the griefing agreement
 * @param {string} config.message - message
 * @returns {Promise} transaction receipts of staking
 */
const Punish = async function({ punishAmount, griefingAddress, message }) {
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
    punishAmount = Ethers.parseEther(punishAmount);

    const punishment = await this.countdownGriefing.punish(
      currentStake,
      punishAmount,
      message
    );

    griefingData[griefingAddress].currentStake = Ethers.formatEther(
      currentStake.sub(punishAmount)
    ).toString();

    await Box.set(Box.DATASTORE_GRIEFINGS, griefingData);

    return punishment;
  } catch (err) {
    throw err;
  }
};

export default Punish;
