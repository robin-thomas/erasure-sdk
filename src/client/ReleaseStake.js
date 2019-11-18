import Box from "../utils/3Box";
import Ethers from "../utils/Ethers";

/**
 * Reward a user
 *
 * @param {Object} config - configuration for reward
 * @param {string} config.amountToRelease - amount to be rewarded
 * @param {string} config.griefingAddress - contract address of the griefing agreement
 * @returns {Promise} transaction receipts of staking
 */
const ReleaseStake = async function({ amountToRelease, griefingAddress }) {
  try {
    let griefingData = await Box.get(Box.DATASTORE_GRIEFINGS);
    const griefing = griefingData[griefingAddress];

    let currentStake = griefing.currentStake;
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
