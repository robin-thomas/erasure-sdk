import Box from "../utils/3Box";

/**
 * Return all the feeds of this user
 *
 * @returns {Promise} all the feeds of this user
 */
const GetGriefings = async function() {
  try {
    return await Box.get(Box.DATASTORE_GRIEFINGS);
  } catch (err) {
    throw err;
  }
};

export default GetGriefings;
