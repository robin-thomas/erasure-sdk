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

  let post, feed;
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
    assert.ok(JSON.parse(data).datahash === (await IPFS.getHash(rawData)));

    const _post = await client.getObject(post.proofhash().proofhash);
    assert.ok(
      JSON.stringify(_post.proofhash()) === JSON.stringify(post.proofhash())
    );
  });

  describe("Escrow", () => {
    describe("createEscrow -> cancel", () => {
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
          agreementCountdown: countdownLength,
          metadata: JSON.stringify({ proofhash: post.proofhash().proofhash })
        }));
        assert.ok(Ethers.isAddress(escrow.address()));

        const _escrow = await client.getObject(escrow.address());
        assert.ok(escrow.address() === _escrow.address());
      });

      it("#cancel", async () => {
        const receipt = await escrow.cancel();
        assert.ok(receipt.events[0].event === "Cancelled");
      });
    });

    describe("createEscrow -> depositPayment -> stake", () => {
      let escrow;
      // const escrowCountdown = 100;

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
          agreementCountdown: countdownLength,
          metadata: JSON.stringify({ proofhash: post.proofhash().proofhash })
        }));
        assert.ok(Ethers.isAddress(escrow.address()));

        const _escrow = await client.getObject(escrow.address());
        assert.ok(escrow.address() === _escrow.address());
      });

      it("#depositPayment", async () => {
        const receipt = await escrow.depositPayment();
        const events = receipt.events.map(e => e.event);
        assert.ok(events.includes("DepositIncreased"));
        assert.ok(events.includes("PaymentDeposited"));

        assert.ok((await escrow.contract().getEscrowStatus()) === 2);
        assert.ok((await escrow.contract().getCountdownStatus()) === 1);
      });

      it("#depositStake", async () => {
        const { receipt, agreementAddress } = await escrow.depositStake();

        assert.ok(Ethers.isAddress(agreementAddress));

        const events = receipt.events
          .map(e => e.event)
          .filter(e => e !== undefined);
        assert.ok(events.includes("DepositIncreased"));
        assert.ok(events.includes("StakeDeposited"));
        assert.ok(events.includes("DeadlineSet"));
      });
    });

    describe("createEscrow -> stake -> depositPayment -> finalize", () => {
      let escrow;
      // const escrowCountdown = 100;

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
          agreementCountdown: countdownLength,
          metadata: JSON.stringify({ proofhash: post.proofhash().proofhash })
        }));
        assert.ok(Ethers.isAddress(escrow.address()));

        const _escrow = await client.getObject(escrow.address());
        assert.ok(escrow.address() === _escrow.address());
      });

      it("#depositStake", async () => {
        const { receipt } = await escrow.depositStake();
        const events = receipt.events
          .map(e => e.event)
          .filter(e => e !== undefined);
        assert.ok(events.includes("DepositIncreased"));
        assert.ok(events.includes("StakeDeposited"));
      });

      it("#depositPayment", async () => {
        const receipt = await escrow.depositPayment();
        const events = receipt.events.map(e => e.event);
        assert.ok(events.includes("DepositIncreased"));
        assert.ok(events.includes("PaymentDeposited"));
        assert.ok(events.includes("DeadlineSet"));

        assert.ok((await escrow.contract().getEscrowStatus()) === 3);
        assert.ok((await escrow.contract().getCountdownStatus()) === 2);
      });

      it("#finalize", async () => {
        const { agreementAddress, receipt } = await escrow.finalize();
        const events = receipt.events.map(e => e.event);
        assert.ok(events.includes("Finalized"));
        assert.ok(Ethers.isAddress(agreementAddress));
      });
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
      assert.ok(JSON.parse(data).datahash === (await IPFS.getHash(rawData)));
    });
  });

  describe("Countdown Griefing", () => {
    let agreement,
      currentStake = "0";

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
      const { receipt } = await agreement.punish(
        punishAmount,
        "This is a punishment"
      );

      let amount = "";
      [currentStake, amount] = subStake(currentStake, receipt.logs[1].data);
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
          assert.fail("Agreement deadline has not passed");
        } catch (err) {
          assert.ok(true);
        }
      });

      it("withdraw after countdown should pass", async () => {
        try {
          const { receipt } = await agreement.requestWithdraw();
          await sleep(countdownLength);
          const { amountWithdrawn } = await agreement.withdraw(account);
          assert.ok(
            Number(currentStake).toString() ===
              Number(amountWithdrawn).toString()
          );
        } catch (err) {
          assert.fail("Should not fail as agreement deadline has passed");
        }
      });
    });
  });

  describe("Simple Griefing", () => {
    let agreement,
      currentStake = "0";

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
      const { receipt } = await agreement.punish(
        punishAmount,
        "This is a punishment"
      );

      let amount = "";
      [currentStake, amount] = subStake(currentStake, receipt.logs[1].data);
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
    const keyhash = await post.reveal();
    const metadata = await IPFS.get(post.proofhash().multihash);
    assert.ok(keyhash === JSON.parse(metadata).keyhash);
  });
});
