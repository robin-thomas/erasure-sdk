import Ethers from "../utils/Ethers";
import Griefing from "../utils/Griefing";

/**
 * Release some stake to the staker
 *
 * @param {Object} config - configuration for releaseStake
 * @param {string} config.amountToRelease - amount to be released
 * @param {string} config.griefingAddress - contract address of the griefing agreement
 * @returns {Promise} transaction receipts of releaseStake
 */
const ReleaseStake = async function({ amountToRelease, griefingAddress }) {
  try {
    const { griefingType } = await Griefing.getMetadata(griefingAddress);
    this.setGriefing(griefingType, griefingAddress);

    return await this.griefing.releaseStake(Ethers.parseEther(amountToRelease));
  } catch (err) {
    throw err;
  }
};

export default ReleaseStake;
