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
    amountToRelease = Ethers.parseEther(amountToRelease);

    const stake = await this.countdownGriefing.releaseStake(
      currentStake,
      amountToRelease
    );

    griefingData[griefingAddress].currentStake = Ethers.formatEther(
      currentStake.sub(amountToRelease)
    ).toString();

    await Box.set(Box.DATASTORE_GRIEFINGS, griefingData);

    return stake;
  } catch (err) {
    throw err;
  }
};

export default ReleaseStake;
