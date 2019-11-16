/* global web3 */

import bn from "bn.js";
import truffle_contract from "@truffle/contract";

import MockNMR_json from "../../artifacts/MockNMR.json";

const bNToStringOrIdentity = a => (bn.isBN(a) ? a.toString() : a);

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

    return wrappedERC20(await contract.at(receipt.contractAddress));
  }
};

export default MockNMR;
