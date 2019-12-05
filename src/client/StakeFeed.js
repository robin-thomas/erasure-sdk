import Box from "../utils/3Box";
import Ethers from "../utils/Ethers";

/**
 * Create a new version string for Agreement (if required)
 *
 * @param {string} appName
 * @param {string} appVersion
 * @returns {Promise}
 */
const getData = (appName, appVersion, data) => {
  data[`${appName}-Agreement`] = appVersion;
  return JSON.stringify(data);
};

/**
 * Stake your feed
 *
 * @param {Object} config - configuration for staking
 * @param {string} config.feedAddress
 * @param {string} config.stakeAmount - amount to be staked
 * @param {string} config.counterParty - party with whom the agreement to be made
 * @param {number} config.countdownLength - duration of the agreement in seconds
 * @param {string} config.griefingType - "countdown" or "simple"
 * @param {string} [config.ratio] - griefing ratio
 * @param {number} [config.ratioType] - griefing ratio type
 * @returns {Promise} transaction receipts of griefing, approval and staking
 */
const StakeFeed = async function({
  feedAddress,
  stakeAmount,
  counterParty,
  countdownLength,
  griefingType,
  ratio,
  ratioType
}) {
  try {
    // Validate griefing type.
    if (!["countdown", "simple"].includes(griefingType)) {
      throw new Error(`Griefing type ${griefingType} is not supported`);
    }

    const operator = await Ethers.getAccount();
    const data = getData(this.appName, this.appVersion, {
      griefingType,
      feedAddress,
      counterParty,
      operator
    });

    // Create griefing agreement.
    this.setGriefing(griefingType, null);
    const griefing = await this.griefingFactory.create({
      ratio,
      ratioType,
      counterParty,
      countdownLength,
      data
    });
    this.setGriefing(griefingType, griefing.address);

    // Mint some mock NMR for test purposes.
    if (process.env.NODE_ENV === "test") {
      await this.nmr.mintMockTokens(operator, Ethers.parseEther("1000"));
    } else {
      const network = await Ethers.getProvider().getNetwork();
      if (network && network.name === "rinkeby") {
        await this.nmr.mintMockTokens(operator, Ethers.parseEther("1000"));
      }
    }

    // Approve and stake NMR.
    const approval = await this.nmr.changeApproval(griefing.address);
    stakeAmount = Ethers.parseEther(stakeAmount);
    const stake = await this.griefing.increaseStake(stakeAmount);

    // Save it to datastore.
    let griefingData = await Box.get(Box.DATASTORE_GRIEFINGS);
    if (griefingData === null) {
      griefingData = [];
    }
    griefingData.push(griefing.address);
    await Box.set(Box.DATASTORE_GRIEFINGS, griefingData);

    return {
      griefing,
      approval,
      stake
    };
  } catch (err) {
    throw err;
  }
};

export default StakeFeed;
