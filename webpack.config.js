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
      },
      { // from https://github.com/adobe-webplatform/Snap.svg/issues/341#issuecomment-143267637
        test: require.resolve('snapsvg'),
        loader: 'imports-loader?this=>window,fix=>module.exports=0'
      },
    ]
  }
};
