/*global self*/
/*eslint no-restricted-globals: ["off", "self"]*/

const process = async ({ network, txParams, secretKey }) => {

};

// Wait for a transaction to be processed.
addEventListener("message", event => {
  process(event.data);
});
