import Ethers from "../utils/Ethers";
import Griefing from "../utils/Griefing";

/**
 * Punish a user
 *
 * @param {Object} config - configuration for punishment
 * @param {string} config.punishAmount - amount to be punished
 * @param {string} config.griefingAddress - contract address of the griefing agreement
 * @param {string} config.message - message
 * @returns {Promise} transaction receipts of punishment
 */
const Punish = async function({ punishAmount, griefingAddress, message }) {
  try {
    const { griefingType } = await Griefing.getMetadata(griefingAddress);
    this.setGriefing(griefingType, griefingAddress);

    return await this.griefing.punish(Ethers.parseEther(punishAmount), message);
  } catch (err) {
    throw err;
  }
};

export default Punish;
