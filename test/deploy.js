import { ethers } from "ethers";
import ganache from "ganache-cli";

import Ethers from "../src/utils/Ethers";

import testConfig from "./test.json";
import contractConfig from "../src/contracts.json";
import appConfig from "../src/config.json";

// Setup ganache
const server = ganache.server({
  ...testConfig.ganache,
  mnemonic: testConfig.metamask.mnemonic
});
server.listen("8545");

const protocolVersion = "v1.3.0";
const provider = new ethers.providers.JsonRpcProvider();
const abiEncoder = new ethers.utils.AbiCoder();

const deployContract = async (contractName, params, signer) => {
  const contractAddress =
    contractConfig[protocolVersion]["rinkeby"][contractName];

  const artifact = require(`../artifacts/${contractName}.json`);

  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    signer
  );
  const contract = await factory.deploy(...params);
  await contract.deployed();

  const receipt = await provider.getTransactionReceipt(
    contract.deployTransaction.hash
  );

  console.log(
    `\tDeployed | ${contractName} | ${
      contract.address
    } | ${receipt.gasUsed.toString()} gas`
  );

  return contract;
};

const deployFactory = async (
  contractName,
  registry,
  template,
  factory = null
) => {
  const signer = provider.getSigner();
  const factoryContract = await deployContract(
    contractName,
    [registry.address, template.address],
    signer
  );

  let tx;
  if (factory !== null) {
    tx = await registry.addFactory(
      factoryContract.address,
      abiEncoder.encode(["address"], [factory.address])
    );
  } else {
    tx = await registry.addFactory(factoryContract.address, "0x");
  }

  const receipt = await provider.getTransactionReceipt(tx.hash);
  console.log(
    `\taddFactory() | ${contractName} | ${receipt.gasUsed.toString()} gas`
  );

  return factoryContract;
};

const deployNMR = async () => {
  const deployAddress = "0x9608010323ed882a38ede9211d7691102b4f0ba0";

  const tx = await provider.getSigner().sendTransaction({
    to: deployAddress,
    value: Ethers.parseEther("100")
  });
  await tx.wait();

  const signer = provider.getSigner(deployAddress);

  // needs to increment the nonce to 1 by
  await signer.sendTransaction({ to: signer.address, value: 0 });

  return await deployContract("MockNMR", [], signer);
};

const deployDAI = async () => {
  const deployAddress = "0xb5b06a16621616875A6C2637948bF98eA57c58fa";

  const tx = await provider.getSigner().sendTransaction({
    to: deployAddress,
    value: Ethers.parseEther("100")
  });
  await tx.wait();

  const signer = provider.getSigner(deployAddress);

  // needs to increment the nonce to 1 by
  await signer.sendTransaction({ to: signer.address, value: 0 });

  return await deployContract("DAI", [], signer);
};

const deploy = async () => {
  let contractRegistry = {};

  const contracts = contractConfig[protocolVersion].rinkeby;
  for (const contractName of Object.keys(contracts)) {
    const contractAddress = contracts[contractName];

    let contract = null;
    if (contractName.endsWith("_Factory")) {
      const name = contractName.replace("_Factory", "");

      let factory = null;
      let registry = contractRegistry.Erasure_Posts;
      if (name.includes("Escrow")) {
        factory = contractRegistry.CountdownGriefing_Factory;
        registry = contractRegistry.Erasure_Escrows;
      } else if (name.includes("Griefing")) {
        registry = contractRegistry.Erasure_Agreements;
      }

      const template = contractRegistry[name];
      contract = await deployFactory(contractName, registry, template, factory);
    } else {
      if (contractName === "DAI") {
        contract = await deployDAI();
      } else if (contractName === "NMR") {
        contract = await deployNMR();
      } else {
        const signer = provider.getSigner();
        contract = await deployContract(contractName, [], signer);
      }
    }

    contractRegistry[contractName] = contract;
  }

  return Object.keys(contractRegistry).reduce((p, c) => {
    p[c] = contractRegistry[c].address;
    return p;
  }, {});
};

export default deploy;
