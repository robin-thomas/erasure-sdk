# Erasure SDK

![](https://img.shields.io/badge/nodejs-12.04-blue.svg)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)

# Table of Contents

1. [Introduction](#introduction)
2. [Features](#features)
3. [Tests](#tests)

# Introduction

**Erasure SDK** is an SDK for Erasure writen in JS.

SDK documentation can be found here: https://erasure-docs.robinthomas2591.now.sh/

SDK can be installed by,

```sh
$ npm install @erasure/sdk
```

# Features

- Supports Erasure version - v1.3.0
- Supports Erasure Feeds, Posts, Escrows and Agreements
- Keyvault for client side encryption and transaction signing (using 3Box)
- Datastore for storing feed, post and other details (using 3Box)
- Ability to pass a web3Provider (optional)
- Simplifies SDK for users using classes & objects.
- ErasureFeed
  - add a post while creating a new feed (optional)
  - create a new post
  - retrieve all the posts in a feed
  - reveal all the posts in a feed
  - check if the posts have been revealed or not
- ErasurePost
  - offer to sell a post
  - find the number of sell offers for a post
  - offer to buy a post
  - find the number of buy offers for a post
  - reveal a post
  - get the total number of times a post has been sold
- ErasureEscrow
  - deposit stake by seller (if the payment is already deposited by buyer, encrypted sym key will be added to escrow)
  - deposit payment into the escrow by the buyer
  - finalize the escrow (and add the encrypted sym key to the escrow)
  - cancel an escrow
- Escrow Agreement
  - stake some amount into an agreement (called by operator)
  - reward the staker (called by counterparty)
  - punish, i.e. burn some stake (called by counterparty)
  - release some stake (called by counterparty)
  - request some withdraw (called by staker to start the countdown to withdraw some stake)
  - withdraw some stake to a recipient (called by staker)
  - check the agreement status
- Given a address/proofhash, detect if its an ErasureFeed, Post, Agreement or Escrow and return the correct object

# Tests

Tests are written using _mocha_ and are executed with the help of _truffle_. Test coverage is using _nyc_.

These tests are run in a test _ganache_ network, which deploys all the Erasure smart contracts v1.2.0 and then runs through all the contract tests.

```sh
npm run test
npm run coverage
```
