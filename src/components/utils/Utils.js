const Utils = {
  // sleep for given ms milliseconds.
  sleep: ms => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
};

export default Utils;
