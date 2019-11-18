import Ethers from "../utils/Ethers";

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
    const stake = await this.countdownGriefing.retrieveStake(recipient);

    this.datastore.griefing.griefing[griefingAddress].currentStake = "0";

    return stake;
  } catch (err) {
    throw err;
  }
};

export default RetrieveStake;
