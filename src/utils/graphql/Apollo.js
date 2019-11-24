import ApolloClient from "apollo-boost";

import config from "../../config.json";
import { GET_FEEDS } from "./Query";

const Apollo = {
  client: null,

  getClient: () => {
    if (Apollo.client === null) {
      Apollo.client = new ApolloClient({
        uri: config.erasure.graph.api
      });
    }

    return Apollo.client;
  },

  execQuery: async (query, args = {}, key) => {
    try {
      const result = await Apollo.getClient().query({
        query: query,
        variables: args
      });

      return result.data[key];
    } catch (err) {
      throw err;
    }
  },

  getFeeds: async operator => {
    try {
      const feeds = await Apollo.execQuery(
        GET_FEEDS,
        {
          operator
        },
        "feeds"
      );

      let _feeds = {};
      for (const feed of feeds) {
        _feeds[feed.id] = {
          ...feed,
          posts: {}
        };

        for (const post of posts) {
          _feeds[feed.id].posts[post.proofHash] = { ...post };
        }
      }

      return _feeds;
    } catch (err) {
      throw err;
    }
  }
};

export default Apollo;
