import config from "../networks.json";

const Network = {
  toNetworkId: network => {
    try {
      return config[network.toLowerCase()].networkId;
    } catch (err) {
      return -1;
    }
  }
};

export default Network;
