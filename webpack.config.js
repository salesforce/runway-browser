module.exports = {
  entry: "./web.js",
  output: {
    path: __dirname,
    filename: "bundle.js"
  },
  module: {
    loaders: [
      {
        test: /\.css$/,
        loader: "style!css"
      },
      {
        test: /\.model$/,
        loader: "raw"
      }
    ]
  }
};
