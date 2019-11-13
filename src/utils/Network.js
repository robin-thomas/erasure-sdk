const Network = {
  toNetworkId: network => {
    switch (network) {
      case "ropsten":
        return 3;
    }
  }
};

export default Network;
