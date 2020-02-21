import { multihash } from "@erasure/crypto-ipfs";
import { ethers } from "ethers";

import IPFS from "./IPFS";

const ESP_1001 = {
  /**
   * encode javascript metadata object into ESP-1001 encoded metadata
   *
   * @param {string} app_name
   * @param {string} app_version
   * @param {string} chain_metadata
   * @param {string} ipfs_metadata
   * @returns {string} encoded metadata
   */
  encodeMetadata: async ({
    application,
    app_version,
    contract_metadata,
    ipfs_metadata,
  }) => {
    let ipld_cid;
    if (ipfs_metadata) {
      ipld_cid = await IPFS.add(JSON.stringify(ipfs_metadata));
    }
    console.log("metadata.ipld_cid", ipld_cid);

    const metadata = {
      metadata_version: "v1.0.0",
      application,
      app_version,
      app_storage: contract_metadata,
      ipld_cid,
    };

    const encodeMetadata = ethers.utils.toUtf8Bytes(JSON.stringify(metadata));
    return encodeMetadata;
  },

  /**
   * decode ESP-1001 encoded metadata into javascript object
   *
   * @param {string} encodeMetadata
   * @returns {Object} metadata
   */
  decodeMetadata: async encodeMetadata => {
    const metadataParsed = JSON.parse(
      ethers.utils.toUtf8String(encodeMetadata),
      // new TextDecoder("utf-8").decode(encodeMetadata),
    );

    if (metadataParsed.metadata_version !== "v1.0.0") {
      throw new Error(
        `Incorrect metadata version: Expected v1.0.0 and got ${metadataParsed.metadata_version}`,
      );
    }
    const ipfs_metadata = JSON.parse(await IPFS.get(metadataParsed.ipld_cid));

    const metadata = {
      application: metadataParsed.application,
      app_version: metadataParsed.app_version,
      contract_metadata: metadataParsed.app_storage,
      ipfs_metadata,
    };
    console.log("metadata", metadata);

    return metadata;
  },
};

export default ESP_1001;
