import Box from "../utils/3Box";

/**
 * Creates a new user
 *
 * @returns {Promise} transaction receipt of new user
 */
const CreateUser = async function() {
  try {
    // Check if the user alrady exists in Box storage.
    let keypair = await Box.getKeyPair();
    if (keypair === null) {
      keypair = await Crypto.asymmetric.genKeyPair();
      Box.setKeyPair(keypair);
    }

    // Register the publicKey in Erasure_Users.
    const publicKey = Buffer.from(keypair.key.publicKey).toString("hex");
    return await this.erasureUsers.registerUser(publicKey);
  } catch (err) {
    throw err;
  }
};

export default CreateUser;
