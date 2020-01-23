const path = require("path");

module.exports = {
  entry: ["./src/index.js"],
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.js",
    libraryTarget: "commonjs2",
    globalObject: "typeof self !== 'undefined' ? self : this"
  },
  // devtool: "eval-source-map",
  module: {
    rules: [
      {
        test: /\.(js)$/,
        exclude: /(node_modules)/,
        use: "babel-loader"
      }
    ]
  },
  node: {
    fs: "empty"
  },
  externals: {
    authereum: {
      commonjs2: "authereum"
    }
  }
};
