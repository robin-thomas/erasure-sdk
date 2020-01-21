import { ethers } from "ethers";
import ThreeBox from "3box";

export default async () => {
  const web3Provider = new ethers.providers.JsonRpcProvider();

  const wallet = web3Provider.getSigner();
  const account = await wallet.getAddress();

  const ethProvider = wallet => {
    return {
      send: (data, callback) => {
        console.log(data);
        if (data.method === "personal_sign") {
          wallet
            .signMessage(data.params[0])
            .then(result => callback(null, { result }));
        } else {
          callback(null, "0x");
        }
      }
    };
  };

  box = await ThreeBox.openBox(account, ethProvider(wallet));
  console.log(box);
};
