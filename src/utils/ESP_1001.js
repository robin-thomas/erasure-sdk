import { multihash } from '@erasure/crypto-ipfs'
import { ethers } from 'ethers'

import Config from './Config'
import IPFS from './IPFS'

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
    app_storage,
    ipfs_metadata,
  }) => {
    let ipld_cid
    if (ipfs_metadata) {
      ipld_cid = await IPFS.add(JSON.stringify(ipfs_metadata))
    }
    const metadata = {
      metadata_version: 'v1.0.0',
      application: application,
      app_version: app_version,
      app_storage: app_storage,
      ipld_cid: ipld_cid,
    }
    const stringMetadata = JSON.stringify(metadata)
    const hexMetadata = ethers.utils.toUtf8Bytes(stringMetadata)
    return hexMetadata
  },
  /**
   * decode ESP-1001 encoded metadata into javascript object
   *
   * @param {string} metadata
   * @returns {Object} metadata
   */
  decodeMetadata: async metadata => {
    const stringMetadata = ethers.utils.toUtf8String(metadata)
    const metadataParsed = JSON.parse(stringMetadata)
    if (metadataParsed.metadata_version !== 'v1.0.0') {
      throw new Error(
        `Incorrect metadata version: Expected v1.0.0 and got ${metadataParsed.metadata_version}`,
      )
    }
    const metadataObject = {
      application: metadataParsed.application,
      app_version: metadataParsed.app_version,
      app_storage: metadataParsed.app_storage,
      ipfs_metadata: JSON.parse(await IPFS.get(metadataParsed.ipld_cid)),
    }
    return metadataObject
  },
}

export default ESP_1001
