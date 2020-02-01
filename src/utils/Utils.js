import bs58 from 'bs58'

const Utils = {
  hashToSha256: hash =>
    bs58
      .decode(hash)
      .toString('hex')
      .replace('1220', '0x'),

  sha256ToHash: hex => Utils.hexToHash(`0x1220${hex.substr(2)}`),
  hexToHash: hex => bs58.encode(Buffer.from(hex.substr(2), 'hex')),
  hexToSha256: hex => `0x${hex.substr(6)}`, // IPFS adds 0x1220 prefix

  isProofhash: hash =>
    hash !== null &&
    hash !== undefined &&
    hash.length === 66 &&
    /[a-f0-9]/.test(hash.substr(2)),
}

export default Utils
