import Box from "../utils/3Box";

/**
 * Create a new version string for Feed (if required)
 *
 * @param {string} version - version string from ErasureClient
 * @returns {Promise} data, feed, hash
 */
const getData = async version => {
  let data = null;

  const feed = await Box.get(Box.DATASTORE_FEEDS);
  const hash = feed && feed.ipfsHash ? feed.ipfsHash : null;

  if (hash === null || hash === undefined) {
    data = JSON.stringify(
      {
        ErasureFeed: version
      },
      null,
      4
    );
  }

  return { data, hash };
};

/**
 * Create a new Feed
 *
 * @returns {Promise} transaction receipt of new feed
 */
const CreateFeed = async function() {
  try {
    const { data, hash } = await getData(this.version);

    // Create the new Feed contract.
    const feed = await this.feedFactory.create({ hash, data });
    feed.timestamp = new Date().toISOString();
    const ipfsHash = feed.ipfsHash;
    delete feed.ipfsHash;

    // store feed details in datastore.
    let boxFeed = await Box.get(Box.DATASTORE_FEEDS);
    if (boxFeed === null) {
      boxFeed = {
        ipfsHash,
        feeds: []
      };
    }
    boxFeed.feeds.push(feed);
    await Box.set(Box.DATASTORE_FEEDS, boxFeed);

    return feed;
  } catch (err) {
    throw err;
  }
};

export default CreateFeed;
