import Box from "../utils/3Box";
import Ethers from "../utils/Ethers";

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
    const griefingData = await Box.get(Box.DATASTORE_GRIEFINGS);
    if (griefingData === null || griefingData[griefingAddress] === undefined) {
      throw new Error(`Unable to find griefing: ${griefingAddress}`);
    }

    const { griefingType } = griefingData[griefingAddress];
    this.setGriefing(griefingType, griefingAddress);

    return await this.griefing.punish(Ethers.parseEther(punishAmount), message);
  } catch (err) {
    throw err;
  }
};

export default Punish;
