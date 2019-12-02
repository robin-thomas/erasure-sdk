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
    let griefingData = await Box.get(Box.DATASTORE_GRIEFINGS);
    if (griefingData === null || griefingData[griefingAddress] === undefined) {
      throw new Error(`Unable to find griefing: ${griefingAddress}`);
    }

    const { griefingType } = griefingData[griefingAddress];
    this.setGriefing(griefingType, griefingAddress);

    const stake = await this.griefing.retrieveStake(recipient);

    griefingData[griefingAddress].currentStake = "0";
    await Box.set(Box.DATASTORE_GRIEFINGS, griefingData);

    return stake;
  } catch (err) {
    throw err;
  }
};

export default RetrieveStake;
