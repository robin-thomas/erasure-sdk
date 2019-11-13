const Network = {
  toNetworkId: network => {
    switch (network.toLowerCase()) {
      case "ropsten":
        return 3;
    }
  }
};

export default Network;
