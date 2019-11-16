const Stake = async function({
  stakeAmount,
  counterParty,
  countdownLength,
  ratio = 0,
  ratioType = 1
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

    // Create griefing agreement.
    const griefing = await this.oneWayGriefingFactory.createExplicit({
      ratio,
      ratioType,
      counterParty,
      countdownLength,
      hash,
      data
    });
    this.oneWayGriefingFactory.setAddress(griefing.address);
    this.datastore.griefing = griefing;

    // Approve and stake NMR.
    const approval = await this.nmr.changeApproval(
      griefing.address /* spender */
    );
    const stake = await this.oneWayGriefingFactory.increaseStake(stakeAmount);

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
