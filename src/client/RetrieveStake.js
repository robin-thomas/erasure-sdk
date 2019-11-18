import Box from "../utils/3Box";
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

    let griefingData = await Box.get(Box.DATASTORE_GRIEFINGS);
    if (griefingData === null) {
      griefingData = {};
    }
    if (griefingData[griefingAddress] === undefined) {
      griefingData[griefingAddress] = {
        currentStake: "0"
      };
    }

    griefingData[griefingAddress].currentStake = "0";
    await Box.set(Box.DATASTORE_GRIEFINGS, griefingData);

    return stake;
  } catch (err) {
    throw err;
  }
};

export default RetrieveStake;
