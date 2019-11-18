import assert from "assert";

import Deployer from "./deploy";
import ErasureClient from "../src";
import Ethers from "../src/utils/Ethers";

import testConfig from "./test.json";

describe("ErasureClient", () => {
  const rewardAmount = "1";
  const stakeAmount = "1";
  const network = "rinkeby";
  const version = "1.0.0";
  const countdownLength = 100000000;

  let postIpfsHash, agreement;
  const post = Math.random().toString(36);

  let client, account, registry;
  before(async () => {
    registry = await Deployer();

    client = new ErasureClient({
      network,
      version,
      registry
    });

    account = Ethers.getAccount();
    console.log(`\n\tUsing eth account: ${account}\n`);
  });

  xit("#createFeed", async () => {
    const result = await client.createFeed();
    assert.ok(Ethers.isAddress(result.address));
    console.log(`\tFeed created at ${result.address}`);
  });

  xit("#createPost", async () => {
    const result = await client.createPost(post);
    postIpfsHash = result.ipfsHash;
  });

  xit("#revealPost", async () => {
    const result = await client.revealPost(postIpfsHash);
    assert.ok(result === postIpfsHash);
  });

  it("#stake", async () => {
    const result = await client.stake({
      stakeAmount,
      counterParty: account,
      countdownLength
    });
    agreement = result.griefing.address;

    const amount = Ethers.parseEther(
      Ethers.bigNumberify(result.stake.logs[0].data)
    ).toString();
    assert.ok(amount === stakeAmount);
  });

  xit("#reward", async () => {
    const result = await client.stake({
      amountToAdd: rewardAmount,
      griefingAddress: agreement
    });

    const amount = Ethers.parseEther(
      Ethers.bigNumberify(result.logs[0].data)
    ).toString();
    assert.ok(amount === rewardAmount);
  });
});
