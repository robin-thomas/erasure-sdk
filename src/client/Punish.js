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
    const griefing = this.datastore.griefing.griefing[griefingAddress];

    const currentStake = Ethers.parseEther(griefing.currentStake);
    punishAmount = Ethers.parseEther(punishAmount);

    const punishment = await this.countdownGriefing.punish(
      currentStake,
      punishAmount,
      message
    );

    this.datastore.griefing.griefing[
      griefingAddress
    ].currentStake = Ethers.formatEther(
      currentStake.sub(punishAmount)
    ).toString();

    return punishment;
  } catch (err) {
    throw err;
  }
};

export default Punish;
