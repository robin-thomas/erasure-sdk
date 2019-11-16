import crypto from "crypto";
import cryptoIpfs from "@erasure/crypto-ipfs";

const Crypto = {
  symmetric: {
    genKey: () => cryptoIpfs.crypto.symmetric.generateKey(),
    encrypt: (key, msg) => cryptoIpfs.crypto.symmetric.encryptMessage(key, msg),
    decrypt: (key, msg) => cryptoIpfs.crypto.symmetric.decryptMessage(key, msg)
  },

  asymmetric: {
    genKeyPair: async web3 => {
      try {
        const accounts = await web3.eth.getAccounts();

        const msg = `I am signing this message to generate my ErasureClient keypair as ${accounts[0]}`;
        const signature = await web3.eth.personal.sign(msg, accounts[0], null);

        const salt = crypto
          .createHash("sha256")
          .update(accounts[0])
          .digest("base64");

        const key = cryptoIpfs.crypto.asymmetric.generateKeyPair(
          signature,
          salt
        );

        return {
          msg,
          signature,
          key,
          salt
        };
      } catch (err) {
        throw err;
      }
    },

    genNonce: () => cryptoIpfs.crypto.asymmetric.generateNonce(),

    encrypt: (msg, nonce, keypair) =>
      cryptoIpfs.crypto.asymmetric.encryptMessage(
        msg,
        nonce,
        keypair.publicKey,
        keypair.secretKey
      ),

    decrypt: (msg, nonce, keypair) =>
      cryptoIpfs.crypto.asymmetric.decryptMessage(
        msg,
        nonce,
        keypair.publicKey,
        keypair.secretKey
      )
  }
};

export default Crypto;
