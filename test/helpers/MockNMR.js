/* global web3 */

import BN from "bn.js";
import truffle_contract from "@truffle/contract";

import Utils from "../../src/utils/Utils";

import MockNMR_json from "../../artifacts/MockNMR.json";

const bNToStringOrIdentity = a => (BN.isBN(a) ? a.toString() : a);

const wrappedERC20 = contract => ({
  ...contract,
  transfer: async (address, amount) =>
    contract.transfer(address, bNToStringOrIdentity(amount)),
  transferAndCall: async (address, amount, payload, options) =>
    contract.transferAndCall(
      address,
      bNToStringOrIdentity(amount),
      payload,
      options
    )
});

const MockNMR = {
  linkContract: async (account, web3) => {
    if (!account) {
      throw Error("No account supplied as a parameter");
    }

    const receipt = await web3.eth.sendTransaction({
      data: MockNMR_json.bytecode,
      from: account,
      gas: 2000000
    });

    const contract = truffle_contract({ abi: MockNMR_json.abi });
    contract.setProvider(web3.currentProvider);
    contract.defaults({
      from: account,
      gas: 3500000,
      gasPrice: 10000000000
    });

    const _contract = await contract.at(receipt.contractAddress);
    const token = wrappedERC20(_contract);
    console.log(`\tMockNMR contract created at: ${token.address}`);

    // Wait for some mock NMR to be minted & transferred.
    while (true) {
      let decimals = await token.decimals();
      decimals = new BN(10, 10).pow(decimals);

      let balance = await token.balanceOf(account);
      balance = balance.div(decimals).toNumber();

      if (balance > 0) {
        console.log(`\tTransferred ${balance} NMR to ${account}\n`);
        break;
      }

      await Utils.sleep(1000);
    }

    return token;
  }
};

export default MockNMR;
