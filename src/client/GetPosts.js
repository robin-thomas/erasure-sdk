import Box from "../utils/3Box";

/**
 * Return all the feeds of this user
 *
 * @returns {Promise} all the feeds of this user
 */
const GetPosts = async function(feedAddress) {
  try {
    const postData = await Box.get(Box.DATASTORE_POSTS);
    return postData[feedAddress];
  } catch (err) {
    throw err;
  }
};

export default GetPosts;
