import Box from "../utils/3Box";
import Ethers from "../utils/Ethers";

/**
 * Create a new version string for Agreement (if required)
 *
 * @param {string} appName
 * @param {string} version - version string from ErasureClient
 * @returns {Promise} data, feed, hash
 */
const getData = (appName, version) => {
  let data = {};
  data[`${appName}-Agreement`] = version;

  return JSON.stringify(data, null, 4);
};

/**
 * Stake your feed
 *
 * @param {Object} config - configuration for staking
 * @param {string} config.feedAddress
 * @param {string} config.proofHash
 * @param {string} config.stakeAmount - amount to be staked
 * @param {string} config.counterParty - party with whom the agreement to be made
 * @param {number} config.countdownLength - duration of the agreement in seconds
 * @param {string} config.griefingType - "countdown" or "simple"
 * @param {string} [config.ratio] - griefing ratio
 * @param {number} [config.ratioType] - griefing ratio type
 * @returns {Promise} transaction receipts of griefing, approval and staking
 */
const Stake = async function({
  feedAddress,
  proofHash,
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
    this.setGriefing(griefingType);

    const data = getData(this.appName, this.version);

    let opts = {
      ratio,
      ratioType,
      counterParty,
      countdownLength,
      data
    };

    // Create griefing agreement.
    const griefing = await this.griefingFactory.create(opts);
    this.griefing.setAddress(griefing.address);

    // Mint some mock NMR for test purposes.
    const operator = await Ethers.getAccount();
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
    const stake = await this.griefing.increaseStake("0", stakeAmount);

    // Save it to datastore.
    let griefingData = await Box.get(Box.DATASTORE_GRIEFINGS);
    if (griefingData === null) {
      griefingData = {};
    }
    griefingData[griefing.address] = {
      feedAddress,
      proofHash,
      data,
      ratio,
      ratioType,
      griefingType,
      operator,
      counterParty,
      countdownLength,
      currentStake: Ethers.formatEther(stakeAmount).toString()
    };
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

export default Stake;
