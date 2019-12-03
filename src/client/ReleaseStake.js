import Box from "../utils/3Box";
import Ethers from "../utils/Ethers";

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
    const griefingData = await Box.get(Box.DATASTORE_GRIEFINGS);
    if (griefingData === null || griefingData[griefingAddress] === undefined) {
      throw new Error(`Unable to find griefing: ${griefingAddress}`);
    }

    const { griefingType } = griefingData[griefingAddress];
    this.setGriefing(griefingType, griefingAddress);

    return await this.griefing.releaseStake(Ethers.parseEther(amountToRelease));
  } catch (err) {
    throw err;
  }
};

export default ReleaseStake;
