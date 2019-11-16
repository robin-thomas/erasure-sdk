import assert from "assert";

import Web3 from "../src/utils/Web3";
import ErasureClient from "../src";
import MockNMR from "./helpers/MockNMR";

import config from "../src/keys.json";

describe("ErasureClient", () => {
  const stakeAmount = "1";
  const network = "rinkeby";
  const version = "1.0.0";
  const countdownLength = 3456000;
  const counterParty = "0x0A8b89246132a14cfe68a65C50B10B297743cd4C";

  let postIpfsHash;
  const post = Math.random().toString(36);

  let web3, client, mockNMR, account;
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

    const accounts = await web3.eth.getAccounts();
    account = accounts[0];

    mockNMR = await MockNMR.linkContract(account, web3);
    assert.ok(web3.utils.isAddress(mockNMR.address));
  });

  it("#createFeed", async () => {
    const result = await client.createFeed();
    assert.ok(web3.utils.isAddress(result.address));
    console.log(`\tContract created at ${result.address}`);
  });

  it("#createPost", async () => {
    const result = await client.createPost(post);
    postIpfsHash = result.ipfsHash;

    assert.ok(web3.utils.isAddress(result.address));
    console.log(`\tContract created at ${result.address}`);
  });

  it("#stake", async () => {
    const result = await client.stake({
      stakeAmount,
      counterParty,
      countdownLength,
      contractAddress: mockNMR.address
    });

    const amount = web3.utils
      .fromWei(web3.utils.toBN(result.stake.logs[0].data))
      .toString();
    assert.ok(amount === stakeAmount);
  });

  it("#revealPost", async () => {
    const result = await client.revealPost(postIpfsHash);
    assert.ok(result === postIpfsHash);
  });
});
