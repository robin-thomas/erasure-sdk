import { ethers } from "ethers";

import Box from "../utils/3Box";
import Crypto from "../utils/Crypto";
import Ethers from "../utils/Ethers";

import contract from "../../artifacts/Erasure_Posts.json";

class Erasure_Posts {
  #registry = {};
  #network = null;
  #contract = null;

  constructor({ registry, network }) {
    this.#network = network;

    if (process.env.NODE_ENV === "test") {
      this.#registry = registry.Erasure_Posts;
      this.#contract = new ethers.Contract(
        this.#registry,
        contract.abi,
        Ethers.getWallet()
      );
    } else {
      this.#registry = Object.keys(registry).reduce((p, network) => {
        p[network] = registry[network].Erasure_Posts;
        return p;
      }, {});

      this.#contract = new ethers.Contract(
        this.#registry[this.#network],
        contract.abi,
        Ethers.getWallet()
      );
    }

    // Listen for any metamask changes.
    if (typeof window !== "undefined" && window.ethereum !== undefined) {
      window.ethereum.on("accountsChanged", function() {
        if (process.env.NODE_ENV === "test") {
          this.#contract = new ethers.Contract(
            this.#registry,
            contract.abi,
            Ethers.getWallet()
          );
        } else {
          this.#contract = new ethers.Contract(
            this.#registry[this.#network],
            contract.abi,
            Ethers.getWallet()
          );
        }
      });
    }
  }

  getPosts = user => {};
}

export default Erasure_Users;
