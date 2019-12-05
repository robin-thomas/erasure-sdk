import { gql } from "apollo-boost";

const GET_FEEDS = gql`
  query Feeds($operator: String!) {
    feeds(where: { operator: $operator }) {
      id
      operator
      staticMetadataB58
      posts {
        proofHash
        staticMetadataB58
      }
    }
  }
`;

export { GET_FEEDS };
