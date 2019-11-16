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

    // Create griefing agreement.
    const griefing = await this.oneWayGriefingFactory.createExplicit({
      ratio,
      ratioType,
      counterParty,
      countdownLength,
      hash,
      data
    });
    this.oneWayGriefing.setAddress(griefing.address);
    this.datastore.griefing = griefing;

    // For test purposes.
    if (
      process.env.NODE_ENV === "test" &&
      contractAddress !== undefined &&
      contractAddress !== null
    ) {
      this.nmr.setAddress(contractAddress);
    }

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
