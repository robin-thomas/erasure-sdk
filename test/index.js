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

const sleep = seconds => {
  return new Promise(resolve => setTimeout(resolve, 1000 * seconds));
};

describe("ErasureClient", () => {
  const punishAmount = "2";
  const rewardAmount = "10";
  const stakeAmount = "11";
  const countdownLength = 1;

  let post,
    feed,
    currentStake = "0";
  const rawData = Math.random().toString(36);

  let client, account, registry;
  before(async () => {
    // Deploy all contracts to ganache.
    registry = await Deployer();

    account = await Ethers.getAccount();
    console.log(`\n\tUsing eth account: ${account}\n`);

    client = new ErasureClient({
      appName: "Test",
      appVersion: "1.0.0",
      protocolVersion: "v1.2.0",
      registry
    });
    await client.login();
  });

  it("#createFeed", async () => {
    ({ feed } = await client.createFeed());
    assert.ok(Ethers.isAddress(feed.address()));

    const _feed = await client.getObject(feed.address());
    assert.ok(feed.address() === _feed.address());
  });

  it("#createPost", async () => {
    ({ post } = await feed.createPost(rawData));
    const data = await IPFS.get(post.proofhash().multihash);
    assert.ok(JSON.parse(data).ipfsHash === (await IPFS.getHash(rawData)));

    const _post = await client.getObject(post.proofhash().proofhash);
    assert.ok(
      JSON.stringify(_post.proofhash()) === JSON.stringify(post.proofhash())
    );
  });

  describe("Escrow", () => {
    let escrow;

    it("create an escrow", async () => {
      ({ escrow } = await client.createEscrow({
        operator: account,
        buyer: account,
        seller: account,
        paymentAmount: stakeAmount,
        stakeAmount: stakeAmount,
        escrowCountdown: countdownLength,
        griefRatio: "1",
        griefRatioType: 2,
        agreementCountdown: countdownLength
      }));
      assert.ok(Ethers.isAddress(escrow.address()));

      const _escrow = await client.getObject(escrow.address());
      assert.ok(escrow.address() === _escrow.address());
    });
  });

  describe("Get Posts of a Feed", () => {
    let feed;
    before(async () => {
      ({ feed } = await client.createFeed());
      assert.ok(Ethers.isAddress(feed.address()));
    });

    it("User with atleast one feed without a post", async () => {
      const posts = await feed.getPosts();
      assert.ok(posts.length === 0);
    });

    it("User with feed(s) with atleast one post", async () => {
      await feed.createPost(rawData);
      const posts = await feed.getPosts();
      assert.ok(posts.length === 1);

      const data = await IPFS.get(posts[0].proofhash().multihash);
      assert.ok(JSON.parse(data).ipfsHash === (await IPFS.getHash(rawData)));
    });
  });

  describe("Countdown Griefing", () => {
    let agreement;
    before(async () => {
      ({ agreement } = await client.createAgreement({
        operator: account,
        staker: account,
        counterparty: account,
        griefRatio: "1",
        griefRatioType: 2,
        countdownLength
      }));
      assert.ok(Ethers.isAddress(agreement.address()));

      const _countdown = await client.getObject(agreement.address());
      assert.ok(agreement.address() === _countdown.address());
    });

    it("#stake", async () => {
      const result = await agreement.reward(stakeAmount);

      let amount = "";
      [currentStake, amount] = addStake(currentStake, result.logs[1].data);
      assert.ok(Number(amount).toString() === stakeAmount);
    });

    it("#reward", async () => {
      const result = await agreement.reward(rewardAmount);

      let amount = "";
      [currentStake, amount] = addStake(currentStake, result.logs[1].data);
      assert.ok(Number(amount).toString() === rewardAmount);
    });

    it("#punish", async () => {
      const result = await agreement.punish(
        punishAmount,
        "This is a punishment"
      );

      let amount = "";
      [currentStake, amount] = subStake(currentStake, result.logs[1].data);
      assert.ok(Number(amount).toString() === punishAmount);
    });

    it("#release", async () => {
      const result = await agreement.release(punishAmount);

      let amount = "";
      [currentStake, amount] = subStake(currentStake, result.logs[1].data);
      assert.ok(Number(amount).toString() === punishAmount);
    });

    describe("withdraw", () => {
      it("withdraw before countdown should fail", async () => {
        try {
          await agreement.withdraw(account);
          assert.fail("0", "1", "Agreement deadline has not passed");
        } catch (err) {
          assert.ok(true);
        }
      });

      it("withdraw after countdown should pass", async () => {
        try {
          const receipt = await agreement.requestWithdraw();
          await sleep(5 * countdownLength);
          await agreement.withdraw(account);
        } catch (err) {
          assert.fail("0", "1", "Agreement deadline has passed");
        }
      });
    });
  });

  describe("Simple Griefing", () => {
    let agreement;
    before(async () => {
      ({ agreement } = await client.createAgreement({
        operator: account,
        staker: account,
        counterparty: account,
        griefRatio: "1",
        griefRatioType: 2
      }));
      assert.ok(Ethers.isAddress(agreement.address()));
    });

    it("#stake", async () => {
      const result = await agreement.reward(stakeAmount);

      let amount = "";
      [currentStake, amount] = addStake(currentStake, result.logs[1].data);
      assert.ok(Number(amount).toString() === stakeAmount);
    });

    it("#reward", async () => {
      const result = await agreement.reward(rewardAmount);

      let amount = "";
      [currentStake, amount] = addStake(currentStake, result.logs[1].data);
      assert.ok(Number(amount).toString() === rewardAmount);
    });

    it("#punish", async () => {
      const result = await agreement.punish(
        punishAmount,
        "This is a punishment"
      );

      let amount = "";
      [currentStake, amount] = subStake(currentStake, result.logs[1].data);
      assert.ok(Number(amount).toString() === punishAmount);
    });

    it("#release", async () => {
      const result = await agreement.release(punishAmount);

      let amount = "";
      [currentStake, amount] = subStake(currentStake, result.logs[1].data);
      assert.ok(Number(amount).toString() === punishAmount);
    });
  });

  it("#revealPost", async () => {
    const ipfsHash = await post.reveal();
    const result = await IPFS.getHash(rawData);
    assert.ok(ipfsHash === result);
  });
});
