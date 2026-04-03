const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.(jpg|jpeg|png|gif|webp)$/i,
        type: 'asset/resource',
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html'
    }),
    new CopyPlugin({
      patterns: [
        { from: 'fence_tool', to: 'fence_tool' },
        { from: 'gate_tool', to: 'gate_tool' },
        { from: 'assets', to: 'assets' },
        { from: 'quiz', to: 'quiz' },
        { from: 'styles.css', to: 'styles.css' },
        { from: 'landing.css', to: 'landing.css' },
        { from: 'wizard.css', to: 'wizard.css' },
        { from: '_redirects', to: '_redirects' },
      ]
    }),
    new webpack.DefinePlugin({
      'process.env.GAS_ENDPOINT': JSON.stringify(process.env.GAS_ENDPOINT || ''),
      'process.env.STRIPE_PUBLISHABLE_KEY': JSON.stringify(process.env.STRIPE_PUBLISHABLE_KEY || ''),
      'process.env.NODE_ENV': JSON.stringify('production'),
    })
  ],
  devServer: {
    static: path.join(__dirname, '.'),
    port: 3000,
    open: true,
    historyApiFallback: true
  }
};
