/**
 * Stake your feed
 *
 * @param {Object} config - configuration for staking
 * @param {string} config.stakeAmount - amount to be staked
 * @param {string} config.counterParty - party with whom the agreement to be made
 * @param {number} config.countdownLength - duration of the agreement in seconds
 * @param {number} [config.ratio] - griefing ratio
 * @param {number} [config.ratioType] - griefing ratio type
 * @param {string} [config.contractAddress] - for mocha test (to get Mock NMR tokens)
 * @returns {Promise} transaction receipts of griefing, approval and staking
 */
const Stake = async function({
  stakeAmount,
  counterParty,
  countdownLength,
  ratio = 0,
  ratioType = 1,
  contractAddress
}) {
  try {
    let data = null;
    const hash = this.datastore.griefing.ipfsHash;
    if (hash === null || hash === undefined) {
      data = JSON.stringify(
        {
          ErasureAgreement: this.version
        },
        null,
        4
      );
    }

    let opts = {
      ratio,
      ratioType,
      counterParty,
      countdownLength,
      hash,
      data
    };

    // Allowed only if its test.
    // so that we shall have some mock NMR.
    if (process.env.NODE_ENV === "test") {
      opts.contractAddress = contractAddress;
      this.nmr.setAddress(contractAddress);
    }

    // Create griefing agreement.
    const griefing = await this.oneWayGriefingFactory.createExplicit(opts);
    this.oneWayGriefing.setAddress(griefing.address);
    this.datastore.griefing = griefing;

    // Approve and stake NMR.
    const spender = griefing.address;
    const approval = await this.nmr.changeApproval(spender);
    const stake = await this.oneWayGriefing.increaseStake(stakeAmount);

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
