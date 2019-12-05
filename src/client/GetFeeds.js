import Box from "../utils/3Box";
import Ethers from "../utils/Ethers";

/**
 * Return all the feeds of this user
 *
 * @param {string} [user] - get all feeds of this user
 * @returns {Promise} all the feeds of this user
 */
const GetFeeds = async function(user) {
  try {
    // Get feeds for current operator.
    if (user === null) {
      return await Box.get(Box.DATASTORE_FEEDS);
    } else {
      let results = await this.feedFactory.getFeeds();

      // Need to filter for required user.
      results = results.filter(
        result => result.operator === Ethers.getAddress(user)
      );

      let feeds = {};
      if (results && results.length > 0) {
        for (const result of results) {
          feeds[result.address] = {
            ...result,
            posts: {}
          };

          this.feed.setAddress(result.address);
          const posts = await this.feed.getPosts();

          if (posts && posts.length > 0) {
            for (const post of posts) {
              feeds[result.address].posts[post.proofHash] = { ...post };
            }
          }
        }
      }

      return feeds;
    }
  } catch (err) {
    throw err;
  }
};

export default GetFeeds;
