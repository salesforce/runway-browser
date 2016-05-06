var path = require('path');

var resolveLoader = {
  root: [
    path.resolve('node_modules'),
  ],
};

module.exports = [{
  devServer: {
    contentBase: './dist/',
  },
  entry: './lib/web.js',
  output: {
    path: './dist/',
    filename: 'bundle.js'
  },
  devtool: 'eval-cheap-module-source-map',
  module: {
    loaders: [
      {
        test: /\.css$/,
        loader: 'style!css'
      },
      {
        test: /\.less$/,
        loader: 'style!css!less'
      },
      {
        test: /\.model$/,
        loader: 'raw'
      },
      {
        test: /\.(woff|woff2)$/,
        loader: 'url-loader?limit=10000&mimetype=application/font-woff'
      },
      {
        test: /\.ttf$/,
        loader: 'file-loader'
      },
      {
        test: /\.eot$/,
        loader: 'file-loader'
      },
      {
        test: /\.svg$/,
        loader: 'file-loader'
      },
      {
        test: /\.jsx$/,
        loader: 'babel-loader',
        query: {
          presets: ['react'],
        },
      },
      {
        test: /\.json$/,
        loader: 'json-loader'
      },
    ]
  },
  resolveLoader: resolveLoader,
}, {
  entry: './lib/worker.js',
  output: {
    path: './dist/',
    filename: 'worker-bundle.js'
  },
  devtool: 'eval-cheap-module-source-map',
  target: 'webworker',
  module: {
    loaders: [
      {
        test: /\.json$/,
        loader: 'json-loader'
      },
    ],
  },
  resolveLoader: resolveLoader,
}];
