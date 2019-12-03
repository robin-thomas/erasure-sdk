import Ethers from "../utils/Ethers";
import Griefing from "../utils/Griefing";

/**
 * Retrieve the stake
 *
 * @param {Object} config - configuration for retrieveStake
 * @param {string} config.griefingAddress - contract address of the griefing agreement
 * @param {string} config.recipient - recipient to receive the stake
 * @returns {Promise} transaction receipts of retrieveStake
 */
const RetrieveStake = async function({ griefingAddress, recipient }) {
  try {
    const { griefingType } = await Griefing.getMetadata(griefingAddress);
    this.setGriefing(griefingType, griefingAddress);

    return await this.griefing.retrieveStake(recipient);
  } catch (err) {
    throw err;
  }
};

export default RetrieveStake;
