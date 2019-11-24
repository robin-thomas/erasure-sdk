import Box from "../utils/3Box";
import Apollo from "../utils/graphql/Apollo";

/**
 * Return all the feeds of this user
 *
 * @returns {Promise} all the feeds of this user
 */
const GetFeeds = async function(operator) {
  try {
    // Get feeds for current operator.
    if (operator === null) {
      return await Box.get(Box.DATASTORE_FEEDS);
    } else {
      return await Apollo.getFeeds(operator);
    }
  } catch (err) {
    throw err;
  }
};

export default GetFeeds;
