class ErasureEscrow {
  #buyer = null;
  #seller = null;
  #contract = null;
  #escrowAddress = null;
  #protocolVersion = "";

  /**
   * @constructor
   * @param {Object} config
   * @param {string} config.protocolVersion
   * @param {string} config.escrowAddress
   */
  constructor({ escrowAddress, protocolVersion }) {
    this.#escrowAddress = escrowAddress;
    this.#protocolVersion = protocolVersion;
  }

  /**
   * Access the web3 contract class
   */
  contract = () => {
    return this.#contract;
  };

  /**
   * Get the address of this escrow
   *
   * @returns {address} address of the escrow
   */
  address = () => {
    return this.#escrowAddress;
  };

  /**
   * Get the address of the seller of this escrow
   *
   * @returns {address} address of the seller
   */
  seller = () => {
    return this.#seller;
  };

  /**
   * Get the address of the buyer of this escrow
   *
   * @returns {address} address of the buyer
   */
  buyer = () => {
    return this.#buyer;
  };

  /**
   * Called by seller to deposit the stake
   * - If the payment is already deposited, also send the encrypted symkey
   *
   * @returns {Promise} address of the agreement
   * @returns {Promise} transaction receipts
   */
  depositStake = async () => {
    const tx = await this.contract().depositStake();
    return await tx.wait();
  };

  /**
   * Called by buyer to deposit the payment
   *
   * @returns {Promise} transaction receipts
   */
  depositPayment = async () => {
    const tx = await this.contract().depositPayment();
    return await tx.wait();
  };

  /**
   * Called by seller to finalize and submit the encrypted symkey
   *
   * @returns {Promise} address of the agreement
   * @returns {Promise} transaction receipts
   */
  finalize = async () => {
    const tx = await this.contract().finalize();
    return await tx.wait();
  };

  /**
   * Called by seller or buyer to attempt to cancel the escrow
   *
   * @returns {Promise} bool true if the cancel succeeded
   * @returns {Promise} transaction receipts
   */
  cancel = async () => {
    const tx = await this.contract().cancel();
    return await tx.wait();
  };

  /**
   * Get the status of the escrow
   *
   * @returns {Promise} object with all relevant data
   */
  checkStatus() {}
}

export default ErasureEscrow;
