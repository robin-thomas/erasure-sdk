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
    const griefing = this.datastore.griefing.griefing[griefingAddress];
    let currentStake = griefing.currentStake;

    currentStake = Ethers.parseEther(currentStake);
    amountToRelease = Ethers.parseEther(amountToRelease);

    const stake = await this.countdownGriefing.releaseStake(
      currentStake,
      amountToRelease
    );

    this.datastore.griefing.griefing[
      griefingAddress
    ].currentStake = Ethers.formatEther(
      currentStake.sub(amountToRelease)
    ).toString();

    return stake;
  } catch (err) {
    throw err;
  }
};

export default ReleaseStake;
