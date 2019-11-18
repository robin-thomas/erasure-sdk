import assert from "assert";

import Deployer from "./deploy";
import ErasureClient from "../src";
import Ethers from "../src/utils/Ethers";

import testConfig from "./test.json";

describe("ErasureClient", () => {
  const punishAmount = "1";
  const rewardAmount = "10";
  const stakeAmount = "1";
  const countdownLength = 100000000;

  let postIpfsHash, griefingAddress;
  const post = Math.random().toString(36);

  let client, account, registry;
  before(async () => {
    // Deploy all contracts to ganache.
    registry = await Deployer();

    client = new ErasureClient({
      network: "rinkeby", // just to load contract abi
      version: "1.0.0", // version string
      registry
    });

    account = Ethers.getAccount();
    console.log(`\n\tUsing eth account: ${account}\n`);
  });

  it("#createFeed", async () => {
    const result = await client.createFeed();
    assert.ok(Ethers.isAddress(result.address));
    console.log(`\tFeed created at ${result.address}`);
  });

  it("#createPost", async () => {
    const result = await client.createPost(post);
    postIpfsHash = result.ipfsHash;
  });

  it("#revealPost", async () => {
    const result = await client.revealPost(postIpfsHash);
    assert.ok(result === postIpfsHash);
  });

  it("#stake", async () => {
    const result = await client.stake({
      stakeAmount,
      counterParty: account,
      countdownLength
    });
    griefingAddress = result.griefing.address;
    assert.ok(Ethers.isAddress(griefingAddress));
    console.log(`\tAgreement created at ${griefingAddress}`);

    const amount = Number(
      Ethers.formatEther(Ethers.bigNumberify(result.stake.logs[0].data))
    ).toString();
    assert.ok(amount === stakeAmount);
  });

  it("#reward", async () => {
    const result = await client.reward({
      griefingAddress,
      rewardAmount
    });

    const amount = Number(
      Ethers.formatEther(Ethers.bigNumberify(result.logs[0].data))
    ).toString();
    assert.ok(amount === rewardAmount);
  });

  it("#punish", async () => {
    const result = await client.punish({
      punishAmount,
      griefingAddress,
      message: "This is a punishment"
    });

    const amount = Number(
      Ethers.formatEther(Ethers.bigNumberify(result.logs[1].data))
    ).toString();
    assert.ok(amount === punishAmount);
  });

  it("#releaseStake", async () => {
    const result = await client.releaseStake({
      amountToRelease: punishAmount,
      griefingAddress
    });

    const amount = Number(
      Ethers.formatEther(Ethers.bigNumberify(result.logs[0].data))
    ).toString();
    assert.ok(amount === punishAmount);
  });
});
