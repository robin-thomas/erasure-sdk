import { ethers } from 'ethers'
import ganache from 'ganache-cli'

import Ethers from '../src/utils/Ethers'

import testConfig from './test.json'
import appConfig from '../src/config.json'

// Setup ganache
const server = ganache.server({
  ...testConfig.ganache,
  mnemonic: testConfig.metamask.mnemonic,
})
server.listen('8545')

const protocolVersion = 'v1.3.0'
const provider = new ethers.providers.JsonRpcProvider()
const signer = provider.getSigner()
const abiEncoder = new ethers.utils.AbiCoder()

const contracts = [
  'MockUniswapFactory',
  'NMR',
  'DAI',
  'Erasure_Posts',
  'Erasure_Escrows',
  'Erasure_Users',
  'Erasure_Agreements',
  'Feed',
  'Feed_Factory',
  'SimpleGriefing',
  'SimpleGriefing_Factory',
  'CountdownGriefing',
  'CountdownGriefing_Factory',
  'CountdownGriefingEscrow',
  'CountdownGriefingEscrow_Factory',
]

// Deployer addresses
const daiDeployAddress = '0xb5b06a16621616875A6C2637948bF98eA57c58fa'
const nmrDeployAddress = '0x9608010323ed882a38ede9211d7691102b4f0ba0'
const uniswapFactoryAddress = '0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95'

const uniswapSigner = provider.getSigner(uniswapFactoryAddress)

const fundSigner = async _signer => {
  await (
    await signer.sendTransaction({
      to: await _signer.getAddress(),
      value: Ethers.parseEther('100'),
    })
  ).wait()
}

const deployContract = async (contractName, params, _signer) => {
  const artifact = require(`@erasure/abis/src/${protocolVersion}/abis/${
    contractName === 'DAI' ? 'MockERC20' : contractName
  }.json`)

  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    _signer,
  )
  const contract = await factory.deploy(...params)
  await contract.deployed()

  const receipt = await provider.getTransactionReceipt(
    contract.deployTransaction.hash,
  )

  console.log(
    `\tDeployed | ${contractName} | ${
      contract.address
    } | ${receipt.gasUsed.toString()} gas`,
  )

  return contract
}

const deployFactory = async (
  contractName,
  registry,
  template,
  factory = null,
) => {
  const signer = provider.getSigner()
  const factoryContract = await deployContract(
    contractName,
    [registry.address, template.address],
    signer,
  )

  let tx
  if (factory !== null) {
    tx = await registry.addFactory(
      factoryContract.address,
      abiEncoder.encode(['address'], [factory.address]),
    )
  } else {
    tx = await registry.addFactory(factoryContract.address, '0x')
  }

  const receipt = await provider.getTransactionReceipt(tx.hash)
  console.log(
    `\taddFactory() | ${contractName} | ${receipt.gasUsed.toString()} gas`,
  )

  return factoryContract
}

const increaseNonce = async (_signer, count = 1) => {
  const address = await _signer.getAddress()

  let index = await provider.getTransactionCount(address)
  while (index < count) {
    await (await _signer.sendTransaction({ to: address })).wait()
    ++index
  }
}

const addLiquidity = async (uniswapFactory, token, uniswapSigner) => {
  const exchange = await deployContract(
    'MockUniswapExchange',
    [token.address, uniswapFactory.address],
    uniswapSigner,
  )

  await uniswapFactory.createExchange(token.address, exchange.address)

  const tokenAmount = ethers.utils.parseEther('1000')
  const ethAmount = ethers.utils.parseEther('45')

  const deadline =
    (await provider.getBlock(await provider.getBlockNumber())).timestamp + 6000

  token = token.connect(uniswapSigner)
  await (
    await token.mintMockTokens(await uniswapSigner.getAddress(), tokenAmount)
  ).wait()
  await (await token.approve(exchange.address, tokenAmount)).wait()

  await exchange.addLiquidity(0, tokenAmount, deadline, {
    value: ethAmount,
  })
}

const deployDAI = async uniswapFactory => {
  const daiSigner = provider.getSigner(daiDeployAddress)
  await fundSigner(daiSigner)

  // Need to increase nonce by 1 to get the correct DAI contract address
  await increaseNonce(daiSigner)
  const token = await deployContract('DAI', [], daiSigner)

  // Need to increase nonce to get the correct DAI uniswap contract address
  await increaseNonce(uniswapSigner, 1225)

  await addLiquidity(uniswapFactory, token, uniswapSigner)

  return token
}

const deployNMR = async uniswapFactory => {
  const nmrSigner = provider.getSigner(nmrDeployAddress)
  await fundSigner(nmrSigner)

  // Need to increase nonce to get the correct NMR contract address
  await increaseNonce(nmrSigner)
  const token = await deployContract('MockNMR', [], nmrSigner)

  // Need to increase nonce to get the correct NMR uniswap contract address
  await increaseNonce(uniswapSigner, 41)

  await addLiquidity(uniswapFactory, token, uniswapSigner)

  return token
}

const deploy = async () => {
  await fundSigner(uniswapSigner)

  let contractRegistry = {}
  for (const contractName of contracts) {
    let contract = null
    if (contractName === 'MockUniswapFactory') {
      contract = await deployContract(contractName, [], signer)
    } else if (contractName.endsWith('_Factory')) {
      const name = contractName.replace('_Factory', '')

      let factory = null
      let registry = contractRegistry.Erasure_Posts
      if (name.includes('Escrow')) {
        factory = contractRegistry.CountdownGriefing_Factory
        registry = contractRegistry.Erasure_Escrows
      } else if (name.includes('Griefing')) {
        registry = contractRegistry.Erasure_Agreements
      }

      const template = contractRegistry[name]
      contract = await deployFactory(contractName, registry, template, factory)
    } else {
      if (contractName === 'DAI') {
        contract = await deployDAI(contractRegistry.MockUniswapFactory)
      } else if (contractName === 'NMR') {
        contract = await deployNMR(contractRegistry.MockUniswapFactory)
      } else {
        contract = await deployContract(contractName, [], signer)
      }
    }

    contractRegistry[contractName] = contract
  }

  return Object.keys(contractRegistry).reduce((p, c) => {
    p[c] = contractRegistry[c].address
    return p
  }, {})
}

export default deploy
