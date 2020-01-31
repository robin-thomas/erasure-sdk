import assert from "assert";
import { ethers } from "ethers";
import { mnemonicToSeedSync } from "bip39";
import hdkey from "ethereumjs-wallet/hdkey";
import Web3 from "web3";
import {
  ecsign,
  toRpcSig,
  hashPersonalMessage
} from "ethereumjs-util/dist/signature";
import { constants } from "@erasure/crypto-ipfs";

import Deployer from "./deploy";
import ErasureClient from "../src";
import IPFS from "../src/utils/IPFS";
import Utils from "../src/utils/Utils";
import Ethers from "../src/utils/Ethers";

import config from "./test.json";

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

// Ganache does not expose a `personal_sign` method.
// Refer: https://github.com/trufflesuite/ganache-core/issues/540
const ganacheProvider = provider => {
  const fn = provider.send.bind(provider);

  provider.send = (data, callback) => {
    if (data.method === "personal_sign") {
      const seed = mnemonicToSeedSync(config.metamask.mnemonic);
      const hdk = hdkey.fromMasterSeed(seed);
      const addrNode = hdk.derivePath("m/44'/60'/0'/0/0");
      const privateKey = addrNode.getWallet().getPrivateKey();

      const msgHash = hashPersonalMessage(Buffer.from(data.params[0]));
      const signature = ecsign(msgHash, Buffer.from(privateKey, "hex"));
      const signatureRPC = toRpcSig(signature.v, signature.r, signature.s);

      callback(null, { result: signatureRPC });
    } else {
      fn(data, callback);
    }
  };

  return provider;
};

describe("ErasureClient", () => {
  const punishAmount = "2";
  const rewardAmount = "10";
  const stakeAmount = "11";
  const countdownLength = 1;

  let post,
    feed,
    proofhash = null;
  const rawData = Math.random().toString(36);

  let client, account, registry;
  before(async () => {
    // Deploy all contracts to ganache.
    registry = await Deployer();

    const provider = new Web3.providers.HttpProvider(
      `http://localhost:${config.ganache.port}`
    );
    const web3Provider = new Web3(ganacheProvider(provider));

    account = (await web3Provider.eth.getAccounts())[0];
    console.log(`\n\tUsing eth account: ${account}\n`);

    client = new ErasureClient({
      registry,
      web3Provider,
      protocolVersion: "v1.3.0"
    });

    await client.login();

    // Mint some mock NMR/DAI tokens.
    await client.mintMockTokens("1000");
    await client.mintMockTokens("1000", constants.TOKEN_TYPES.DAI);

    feed = await client.createFeed();
    assert.ok(Ethers.isAddress(feed.address()));

    const _feed = await client.getObject(feed.address());
    assert.ok(feed.address() === _feed.address());

    post = await feed.createPost(rawData);
    const data = await IPFS.get(post.proofhash().multihash);
    assert.ok(JSON.parse(data).datahash === (await IPFS.getHash(rawData)));

    proofhash = post.proofhash().proofhash;
  });

  describe("Feed", () => {
    it("Create a feed with a post", async () => {
      const feed = await client.createFeed({ data: rawData });
      assert.ok(Ethers.isAddress(feed.address()));

      const _feed = await client.getObject(feed.address());
      assert.ok(feed.address() === _feed.address());

      assert.ok(feed.owner() === account);

      const post = (await feed.getPosts())[0];
      const data = await IPFS.get(post.proofhash().multihash);
      assert.ok(JSON.parse(data).datahash === (await IPFS.getHash(rawData)));

      assert.ok((await post.checkStatus()).revealed === false);

      const _post = await client.getObject(post.proofhash().proofhash);
      assert.ok(
        JSON.stringify(_post.proofhash()) === JSON.stringify(post.proofhash())
      );
    });

    it("Create a feed with invalid post proofhash", async () => {
      try {
        const feed = await client.createFeed({
          proofhash: "fake_proofhash"
        });
        assert.fail("Test supposed to fail");
      } catch (err) {
        assert.ok(true);
      }
    });

    it("Create a feed with a post and reveal it", async () => {
      const feed = await client.createFeed({ data: rawData });
      assert.ok(Ethers.isAddress(feed.address()));

      const post = (await feed.getPosts())[0];
      assert.ok((await post.checkStatus()).revealed === false);

      await feed.reveal();
      assert.ok((await feed.checkStatus()).revealed === true);
    });
  });

  describe("Post", () => {
    it("Create a post", async () => {
      let _post = await client.getObject(post.proofhash().proofhash);
      assert.ok(
        JSON.stringify(_post.proofhash()) === JSON.stringify(post.proofhash())
      );

      _post = await client.getObject(post.proofhash().multihash);
      assert.ok(
        JSON.stringify(_post.proofhash()) === JSON.stringify(post.proofhash())
      );
    });

    it("Create a post with proofhash", async () => {
      const post = await feed.createPost(null, proofhash);
      const data = await IPFS.get(post.proofhash().multihash);
      assert.ok(JSON.parse(data).datahash === (await IPFS.getHash(rawData)));

      assert.ok(post.owner() === account);

      const _post = await client.getObject(post.proofhash().proofhash);
      assert.ok(
        JSON.stringify(_post.proofhash()) === JSON.stringify(post.proofhash())
      );
    });

    it("Sell the post", async () => {
      await post.offerSell({
        paymentAmount: stakeAmount,
        stakeAmount: stakeAmount,
        escrowCountdown: countdownLength,
        griefRatio: "1",
        griefRatioType: 2,
        agreementCountdown: countdownLength
      });

      const escrows = await post.getSellOffers();
      assert.ok(escrows[0].seller() === account);
    });

    it("Buy the post", async () => {
      await post.offerBuy({
        paymentAmount: stakeAmount,
        stakeAmount: stakeAmount,
        escrowCountdown: countdownLength,
        griefRatio: "1",
        griefRatioType: 2,
        agreementCountdown: countdownLength
      });

      const escrows = await post.getBuyOffers();
      assert.ok(escrows[0].buyer() === account);
    });

    it("Reveal the post", async () => {
      await post.reveal();
      assert.ok((await post.checkStatus()).revealed === true);
    });
  });

  describe("Escrow (NMR)", () => {
    describe("createEscrow -> stake -> cancel", () => {
      let escrow;

      it("create an escrow", async () => {
        escrow = await client.createEscrow({
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
        });
        assert.ok(Ethers.isAddress(escrow.address()));
        assert.ok(escrow.tokenId() === constants.TOKEN_TYPES.NMR);

        const _escrow = await client.getObject(escrow.address());
        assert.ok(escrow.address() === _escrow.address());
      });

      it("#depositStake", async () => {
        const { receipt, agreementAddress } = await escrow.depositStake();

        // no agreement created since no seller payment made.
        assert.ok(!Ethers.isAddress(agreementAddress));
        assert.ok((await escrow.getEscrowStatus()) === 1); // onlyStakeDeposited
      });

      it("#cancel", async () => {
        const receipt = await escrow.cancel();
        const events = receipt.events.map(e => e.event);
        assert.ok(events.includes("Cancelled"));
      });
    });

    describe("createEscrow -> depositPayment -> stake", () => {
      let escrow;

      it("create an escrow", async () => {
        escrow = await client.createEscrow({
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
        });
        assert.ok(Ethers.isAddress(escrow.address()));
        assert.ok(escrow.tokenId() === constants.TOKEN_TYPES.NMR);

        const _escrow = await client.getObject(escrow.address());
        assert.ok(escrow.address() === _escrow.address());
      });

      it("#depositPayment", async () => {
        const receipt = await escrow.depositPayment();
        const events = receipt.events.map(e => e.event);
        assert.ok(events.includes("DepositIncreased"));
        assert.ok(events.includes("PaymentDeposited"));

        assert.ok((await escrow.getEscrowStatus()) === 2); // onlyPaymentDeposited
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

      it("create an escrow", async () => {
        escrow = await client.createEscrow({
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
        });
        assert.ok(Ethers.isAddress(escrow.address()));
        assert.ok(escrow.tokenId() === constants.TOKEN_TYPES.NMR);

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

        assert.ok((await escrow.getEscrowStatus()) === 3); // isFinalized
        assert.ok((await escrow.contract().getCountdownStatus()) === 2);
      });

      it("#finalize", async () => {
        const { agreementAddress, receipt } = await escrow.finalize();
        const events = receipt.events.map(e => e.event);
        assert.ok(events.includes("Finalized"));
        assert.ok(Ethers.isAddress(agreementAddress));
      });
    });

    describe("createEscrow -> stake -> depositPayment -> cancel", () => {
      let escrow;

      it("create an escrow", async () => {
        escrow = await client.createEscrow({
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
        });
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

        assert.ok((await escrow.getEscrowStatus()) === 3); // isDeposited
        assert.ok((await escrow.contract().getCountdownStatus()) === 2);
      });

      it("#cancel", async () => {
        await sleep(countdownLength);

        const receipt = await escrow.cancel();
        const events = receipt.events.map(e => e.event);
        assert.ok(events.includes("Cancelled"));
      });
    });
  });

  describe("Escrow (DAI)", () => {
    describe("createEscrow -> stake -> cancel", () => {
      let escrow;

      it("create an escrow", async () => {
        escrow = await client.createEscrow({
          operator: account,
          buyer: account,
          seller: account,
          paymentAmount: stakeAmount,
          stakeAmount: stakeAmount,
          escrowCountdown: countdownLength,
          griefRatio: "1",
          griefRatioType: 2,
          agreementCountdown: countdownLength,
          tokenId: constants.TOKEN_TYPES.DAI,
          metadata: JSON.stringify({ proofhash: post.proofhash().proofhash })
        });
        assert.ok(Ethers.isAddress(escrow.address()));
        assert.ok(escrow.tokenId() === constants.TOKEN_TYPES.DAI);

        const _escrow = await client.getObject(escrow.address());
        assert.ok(escrow.address() === _escrow.address());
      });

      it("#depositStake", async () => {
        const { receipt, agreementAddress } = await escrow.depositStake();

        // no agreement created since no seller payment made.
        assert.ok(!Ethers.isAddress(agreementAddress));
        assert.ok((await escrow.getEscrowStatus()) === 1); // onlyStakeDeposited
      });

      it("#cancel", async () => {
        const receipt = await escrow.cancel();
        const events = receipt.events.map(e => e.event);
        assert.ok(events.includes("Cancelled"));
      });
    });

    describe("createEscrow -> depositPayment -> stake", () => {
      let escrow;

      it("create an escrow", async () => {
        escrow = await client.createEscrow({
          operator: account,
          buyer: account,
          seller: account,
          paymentAmount: stakeAmount,
          stakeAmount: stakeAmount,
          escrowCountdown: countdownLength,
          griefRatio: "1",
          griefRatioType: 2,
          agreementCountdown: countdownLength,
          tokenId: constants.TOKEN_TYPES.DAI,
          metadata: JSON.stringify({ proofhash: post.proofhash().proofhash })
        });
        assert.ok(Ethers.isAddress(escrow.address()));
        assert.ok(escrow.tokenId() === constants.TOKEN_TYPES.DAI);

        const _escrow = await client.getObject(escrow.address());
        assert.ok(escrow.address() === _escrow.address());
      });

      it("#depositPayment", async () => {
        const receipt = await escrow.depositPayment();
        const events = receipt.events.map(e => e.event);
        assert.ok(events.includes("DepositIncreased"));
        assert.ok(events.includes("PaymentDeposited"));

        assert.ok((await escrow.getEscrowStatus()) === 2); // onlyPaymentDeposited
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

      it("create an escrow", async () => {
        escrow = await client.createEscrow({
          operator: account,
          buyer: account,
          seller: account,
          paymentAmount: stakeAmount,
          stakeAmount: stakeAmount,
          escrowCountdown: countdownLength,
          griefRatio: "1",
          griefRatioType: 2,
          agreementCountdown: countdownLength,
          tokenId: constants.TOKEN_TYPES.DAI,
          metadata: JSON.stringify({ proofhash: post.proofhash().proofhash })
        });
        assert.ok(Ethers.isAddress(escrow.address()));
        assert.ok(escrow.tokenId() === constants.TOKEN_TYPES.DAI);

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

        assert.ok((await escrow.getEscrowStatus()) === 3); // isFinalized
        assert.ok((await escrow.contract().getCountdownStatus()) === 2);
      });

      it("#finalize", async () => {
        const { agreementAddress, receipt } = await escrow.finalize();
        const events = receipt.events.map(e => e.event);
        assert.ok(events.includes("Finalized"));
        assert.ok(Ethers.isAddress(agreementAddress));
      });
    });

    describe("createEscrow -> stake -> depositPayment -> cancel", () => {
      let escrow;

      it("create an escrow", async () => {
        escrow = await client.createEscrow({
          operator: account,
          buyer: account,
          seller: account,
          paymentAmount: stakeAmount,
          stakeAmount: stakeAmount,
          escrowCountdown: countdownLength,
          griefRatio: "1",
          griefRatioType: 2,
          agreementCountdown: countdownLength,
          tokenId: constants.TOKEN_TYPES.DAI,
          metadata: JSON.stringify({ proofhash: post.proofhash().proofhash })
        });
        assert.ok(Ethers.isAddress(escrow.address()));
        assert.ok(escrow.tokenId() === constants.TOKEN_TYPES.DAI);

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

        assert.ok((await escrow.getEscrowStatus()) === 3); // isDeposited
        assert.ok((await escrow.contract().getCountdownStatus()) === 2);
      });

      it("#cancel", async () => {
        await sleep(countdownLength);

        const receipt = await escrow.cancel();
        const events = receipt.events.map(e => e.event);
        assert.ok(events.includes("Cancelled"));
      });
    });
  });

  describe("Get Posts of a Feed", () => {
    let feed;
    before(async () => {
      feed = await client.createFeed();
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

  describe("Countdown Griefing (staking with NMR)", () => {
    let agreement,
      griefRatio = "2",
      currentStake = "0";

    before(async () => {
      agreement = await client.createAgreement({
        operator: account,
        staker: account,
        counterparty: account,
        griefRatio,
        griefRatioType: 2,
        countdownLength
      });
      assert.ok(Ethers.isAddress(agreement.address()));
      assert.ok(agreement.tokenId() === constants.TOKEN_TYPES.NMR);

      const _countdown = await client.getObject(agreement.address());
      assert.ok(agreement.address() === _countdown.address());
    });

    it("#stake", async () => {
      const result = await agreement.stake(stakeAmount);

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
      const { cost, receipt } = await agreement.punish(
        punishAmount,
        "This is a punishment"
      );

      const punish = (Number(punishAmount) * Number(griefRatio)).toString();
      assert.ok(Number(cost).toString() === punish);

      // cost is taken from the account balance.
      // punishment is taken from the existing stake
      currentStake = (Number(currentStake) - Number(punishAmount)).toString();
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

  describe("Simple Griefing (staking with DAI)", () => {
    let agreement,
      currentStake = "0";

    before(async () => {
      agreement = await client.createAgreement({
        tokenId: constants.TOKEN_TYPES.DAI,
        operator: account,
        counterparty: account,
        griefRatio: "1",
        griefRatioType: 2
      });
      assert.ok(Ethers.isAddress(agreement.address()));
      assert.ok(agreement.tokenId() === constants.TOKEN_TYPES.DAI);

      const _simple = await client.getObject(agreement.address());
      assert.ok(agreement.address() === _simple.address());
      assert.ok(_simple.tokenId() === constants.TOKEN_TYPES.DAI);

      await agreement.checkStatus();
    });

    it("#stake", async () => {
      const result = await agreement.stake(stakeAmount);

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
      const { cost, receipt } = await agreement.punish(
        punishAmount,
        "This is a punishment"
      );

      assert.ok(Number(cost).toString() === punishAmount);
    });

    it("#release", async () => {
      const result = await agreement.release(punishAmount);

      let amount = "";
      [currentStake, amount] = subStake(currentStake, result.logs[1].data);
      assert.ok(Number(amount).toString() === punishAmount);
    });
  });
});
