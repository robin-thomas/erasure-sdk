import Box from "../utils/3Box";

/**
 * Create a new version string for Feed
 *
 * @param {string} appName
 * @param {string} version
 * @returns {Promise} json string data
 */
const getData = (appName, appVersion) => {
  let data = {};
  data[`${appName}-Feed`] = appVersion;
  return JSON.stringify(data);
};

/**
 * Create a new Feed
 *
 * @returns {Promise} transaction receipt of new feed
 */
const CreateFeed = async function() {
  try {
    const data = getData(this.appName, this.appVersion);

    // Create the new Feed contract.
    const feed = await this.feedFactory.create(data);

    // store feed details in datastore.
    let boxFeed = await Box.get(Box.DATASTORE_FEEDS);
    if (boxFeed === null) {
      boxFeed = {};
    }
    boxFeed[feed.id] = feed;
    await Box.set(Box.DATASTORE_FEEDS, boxFeed);

    return feed;
  } catch (err) {
    throw err;
  }
};

export default CreateFeed;
