const createFeed = async function() {
  try {
    let data = null;

    const hash = this.datastore.feed.ipfsHash;
    if (hash === null || hash === undefined) {
      data = JSON.stringify(
        {
          ErasureFeed: this.version
        },
        null,
        4
      );
    }

    this.datastore.feed = await this.feedFactory.createExplicit({
      hash,
      data
    });
    this.datastore.feed.timestamp = new Date().toISOString();

    // Feed contract has been created.
    // Update the contract object.
    this.feed.setAddress(this.datastore.feed.address);

    return this.datastore.feed;
  } catch (err) {
    throw err;
  }
};

export default createFeed;
