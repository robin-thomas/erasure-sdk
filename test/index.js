import assert from "assert";
import { ethers } from "ethers";

import Deployer from "./deploy";
import ErasureClient from "../src";
import IPFS from "../src/utils/IPFS";
import Ethers from "../src/utils/Ethers";

import testConfig from "./test.json";

const addStake = (stake, amount) => {
  stake = Ethers.parseEther(stake);
  amount = Ethers.bigNumberify(amount);

  stake = stake.add(amount);

  return [Ethers.formatEther(stake), Ethers.formatEther(amount)];
};

const subStake = (stake, amount) => {
  stake = Ethers.parseEther(stake);
  amount = Ethers.bigNumberify(amount);

  stake = stake.sub(amount);

  return [Ethers.formatEther(stake), Ethers.formatEther(amount)];
};

describe("ErasureClient", () => {
  const punishAmount = "2";
  const rewardAmount = "10";
  const stakeAmount = "11";
  const countdownLength = 100000000;

  let proofHash,
    feedAddress,
    griefingAddress,
    currentStake = "0";
  const post = Math.random().toString(36);

  let client, account, registry;
  before(async () => {
    // Deploy all contracts to ganache.
    registry = await Deployer();

    account = await Ethers.getAccount();
    console.log(`\n\tUsing eth account: ${account}\n`);

    client = new ErasureClient({
      appVersion: "1.0.0",
      appName: "Test",
      registry
    });
    await client.createUser();
  });

  it("#createFeed", async () => {
    const result = await client.createFeed();
    feedAddress = result.id;
    assert.ok(Ethers.isAddress(feedAddress));
    console.log(`\tFeed created at ${feedAddress}`);
  });

  it("#createPost", async () => {
    proofHash = await client.createPost(post, feedAddress);
  });

  describe("#getFeeds", () => {
    it("User without a feed", async () => {
      const feeds = await client.getFeeds(ethers.constants.AddressZero);
      assert.ok(Object.keys(feeds).length === 0);
    });

    it("User with feed(s) with atleast one post", async () => {
      const feeds = await client.getFeeds();
      assert.ok(feeds[feedAddress].posts[proofHash].proofHash === proofHash);
    });

    it("User with atleast one feed without a post", async () => {
      const result = await client.createFeed();
      const feeds = await client.getFeeds(account);
      assert.ok(Object.keys(feeds[result.id].posts).length === 0);
    });
  });

  describe("Countdown Griefing", () => {
    it("#stake", async () => {
      const result = await client.stake({
        stakeAmount,
        proofHash,
        feedAddress,
        griefingType: "countdown",
        counterParty: account,
        countdownLength
      });
      griefingAddress = result.griefing.address;
      assert.ok(Ethers.isAddress(griefingAddress));
      console.log(`\tAgreement created at ${griefingAddress}`);

      let amount = "";
      [currentStake, amount] = addStake(
        currentStake,
        result.stake.logs[1].data
      );
      assert.ok(Number(amount).toString() === stakeAmount);
    });

    it("#sellPost", async () => {
      await client.sellPost(griefingAddress);
    });

    it("#buyPost", async () => {
      const _post = await client.buyPost(griefingAddress);
      assert(_post === post);
    });

    it("#reward", async () => {
      const result = await client.reward({
        griefingAddress,
        rewardAmount
      });

      let amount = "";
      [currentStake, amount] = addStake(currentStake, result.logs[1].data);
      assert.ok(Number(amount).toString() === rewardAmount);
    });

    it("#punish", async () => {
      const result = await client.punish({
        punishAmount,
        griefingAddress,
        message: "This is a punishment"
      });

      let amount = "";
      [currentStake, amount] = subStake(currentStake, result.logs[1].data);
      assert.ok(Number(amount).toString() === punishAmount);
    });

    it("#releaseStake", async () => {
      const result = await client.releaseStake({
        amountToRelease: punishAmount,
        griefingAddress
      });

      let amount = "";
      [currentStake, amount] = subStake(currentStake, result.logs[1].data);
      assert.ok(Number(amount).toString() === punishAmount);
    });

    it("#retrieveStake", async () => {
      try {
        await client.retrieveStake({
          recipient: Ethers.AddressZero(),
          griefingAddress
        });
        assert.fail("0", "1", "Agreement deadline has not passed");
      } catch (err) {
        assert.ok(true);
      }
    });

    it("#getGriefings", async () => {
      const griefings = await client.getGriefings();
      assert.ok(griefings.includes(griefingAddress));
    });
  });

  describe("Simple Griefing", () => {
    it("#stake", async () => {
      const result = await client.stake({
        stakeAmount,
        proofHash,
        feedAddress,
        griefingType: "simple",
        counterParty: account,
        countdownLength
      });
      griefingAddress = result.griefing.address;
      assert.ok(Ethers.isAddress(griefingAddress));
      console.log(`\tAgreement created at ${griefingAddress}`);

      let amount = "";
      [currentStake, amount] = addStake(
        currentStake,
        result.stake.logs[1].data
      );
      assert.ok(Number(amount).toString() === stakeAmount);
    });

    it("#sellPost", async () => {
      await client.sellPost(griefingAddress);
    });

    it("#buyPost", async () => {
      const _post = await client.buyPost(griefingAddress);
      assert(_post === post);
    });

    it("#reward", async () => {
      const result = await client.reward({
        griefingAddress,
        rewardAmount
      });

      let amount = "";
      [currentStake, amount] = addStake(currentStake, result.logs[1].data);
      assert.ok(Number(amount).toString() === rewardAmount);
    });

    it("#punish", async () => {
      const result = await client.punish({
        punishAmount,
        griefingAddress,
        message: "This is a punishment"
      });

      let amount = "";
      [currentStake, amount] = subStake(currentStake, result.logs[1].data);
      assert.ok(Number(amount).toString() === punishAmount);
    });

    it("#releaseStake", async () => {
      const result = await client.releaseStake({
        amountToRelease: punishAmount,
        griefingAddress
      });

      let amount = "";
      [currentStake, amount] = subStake(currentStake, result.logs[1].data);
      assert.ok(Number(amount).toString() === punishAmount);
    });

    it("#retrieveStake", async () => {
      try {
        await client.retrieveStake({
          recipient: Ethers.AddressZero(),
          griefingAddress
        });
        assert.fail("0", "1", "Agreement deadline has not passed");
      } catch (err) {
        assert.ok(true);
      }
    });

    it("#getGriefings", async () => {
      const griefings = await client.getGriefings();
      assert.ok(griefings.includes(griefingAddress));
    });
  });

  it("#revealPost", async () => {
    const ipfsHash = await client.revealPost(feedAddress, proofHash);
    const result = await IPFS.get(ipfsHash);
    assert.ok(result === post);
  });
});
