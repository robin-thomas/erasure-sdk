import { ethers } from "ethers";
import bs58 from "bs58";

import Ethers from "./Ethers";
import IPFS from "./IPFS";

const Griefing = {
  getMetadata: async griefingAddress => {
    try {
      let provider = Ethers.getProvider();
      if (process.env.NODE_ENV === "test") {
        provider = new ethers.providers.JsonRpcProvider();
      }

      const results = await provider.getLogs({
        address: griefingAddress,
        topics: [ethers.utils.id("MetadataSet(bytes)")]
      });

      const abiCoder = ethers.utils.defaultAbiCoder;
      const data = abiCoder.decode(["bytes"], results[0].data)[0];
      const hex = ethers.utils.toUtf8String(data);
      const ipfsHash = bs58.encode(Buffer.from(hex.substr(2), "hex"));

      const result = await IPFS.get(ipfsHash);
      return JSON.parse(result);
    } catch (err) {
      throw err;
    }
  }
};

export default Griefing;
