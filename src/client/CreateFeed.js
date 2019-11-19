import Box from "../utils/3Box";

/**
 * Create a new version string for Feed (if required)
 *
 * @param {string} version - version string from ErasureClient
 * @returns {Promise} data, feed, hash
 */
const getData = async version => {
  let data = null;

  let feed = await Box.get(Box.DATASTORE_FEED);
  const hash = feed ? feed.ipfsHash : null;

  if (hash === null || hash === undefined) {
    data = JSON.stringify(
      {
        ErasureFeed: version
      },
      null,
      4
    );
  }

  return { data, feed, hash };
};

/**
 * Create a new Feed
 *
 * @returns {Promise} transaction receipt of new feed
 */
const CreateFeed = async function() {
  try {
    let { data, feed, hash } = await getData(this.version);

    // Create the new Feed contract.
    feed = await this.feedFactory.create({ hash, data });
    feed.timestamp = new Date().toISOString();

    // store feed details in datastore.
    await Box.set(Box.DATASTORE_FEED, feed);

    // Feed contract has been created.
    // Update the contract object.
    this.feed.setAddress(feed.address);

    return feed;
  } catch (err) {
    throw err;
  }
};

export default CreateFeed;
