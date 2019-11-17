import assert from "assert";

import ErasureClient from "../src";
import Ethers from "../src/utils/Ethers";

import config from "../src/keys.json";

describe("ErasureClient", () => {
  const stakeAmount = "1";
  const network = "rinkeby";
  const version = "1.0.0";
  const countdownLength = 100000000;

  let postIpfsHash;
  const post = Math.random().toString(36);

  let client, account;
  before(async () => {
    client = new ErasureClient({
      network,
      version
    });

    account = Ethers.getAccount();
    console.log(`\tUsing eth account: ${account}`);
  });

  it("#createFeed", async () => {
    const result = await client.createFeed();
    assert.ok(Ethers.isAddress(result.address));
    console.log(`\tContract created at ${result.address}`);
  });

  it("#createPost", async () => {
    const result = await client.createPost(post);
    postIpfsHash = result.ipfsHash;
  });

  it("#stake", async () => {
    const result = await client.stake({
      stakeAmount,
      counterParty: account,
      countdownLength
    });

    const amount = Ethers.parseEther(
      Ethers.bigNumberify(result.stake.logs[0].data)
    ).toString();
    assert.ok(amount === stakeAmount);
  });

  xit("#revealPost", async () => {
    const result = await client.revealPost(postIpfsHash);
    assert.ok(result === postIpfsHash);
  });
});
