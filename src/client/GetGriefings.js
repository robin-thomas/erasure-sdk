import Box from "../utils/3Box";

/**
 * Return all the griefings of this user
 *
 * @returns {Promise} all the griefings of this user
 */
const GetGriefings = async function() {
  try {
    return await Box.get(Box.DATASTORE_GRIEFINGS);
  } catch (err) {
    throw err;
  }
};

export default GetGriefings;
