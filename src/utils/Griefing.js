import { ethers } from "ethers";

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
        topics: [ethers.utils.id("MetadataSet(bytes)")],
        fromBlock: 0
      });

      // Didnt find any griefing.
      if (!results || results.length === 0) {
        return {};
      }

      const abiCoder = ethers.utils.defaultAbiCoder;
      const result = results[results.length - 1];
      const data = abiCoder.decode(["bytes"], result.data)[0];
      const ipfsHash = IPFS.hexToHash(data);

      const ipfsData = await IPFS.get(ipfsHash);
      const metadata = JSON.parse(ipfsData);

      return {
        ...metadata,
        nonce: metadata.nonce
          ? new Uint8Array(metadata.nonce.split(","))
          : null,
        encryptedSymmetricKey: metadata.encryptedSymmetricKey
          ? new Uint8Array(metadata.encryptedSymmetricKey.split(","))
          : null
      };
    } catch (err) {
      throw err;
    }
  }
};

export default Griefing;
