import assert from "assert";

import Web3 from "../src/utils/Web3";
import ErasureClient from "../src";

import config from "../src/keys.json";

describe("ErasureClient", () => {
  const timeout = 1000 * 60 * 20; // 20 minutes

  const network = "rinkeby";
  const version = "1.0.0";

  let postIpfsHash;
  const post = Math.random().toString(36);

  let web3, client;
  before(async () => {
    web3 = await Web3.getWeb3(null, {
      infura: config.infura.rinkeby.api,
      mnemonic: config.metamask.mnemonic
    });

    client = new ErasureClient({
      web3,
      network,
      version
    });
  });

  it("#createFeed", async () => {
    const result = await client.createFeed();
    assert.ok(web3.utils.isAddress(result.address));
    console.log(`\tContract created at ${result.address}`);
  }).timeout(timeout);

  it("#createPost", async () => {
    const result = await client.createPost(post);
    postIpfsHash = result.ipfsHash;

    assert.ok(web3.utils.isAddress(result.address));
    console.log(`\tContract created at ${result.address}`);
  }).timeout(timeout);

  it("#revealPost", async () => {
    const result = await client.revealPost(postIpfsHash);
    assert.ok(result === postIpfsHash);
  }).timeout(timeout);
});
