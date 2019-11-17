const Utils = {
  /**
   * sleep for given milliseconds.
   *
   * @param {number} ms - amount to sleep (in milliseconds)
   * @returns {Promise} - wait
   */
  sleep: ms => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

export default Utils;
