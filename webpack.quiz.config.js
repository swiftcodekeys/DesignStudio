// Quiz-only bundle. Deployed to quiz.grandviewfence.com via CF Pages project
// grandview-quiz. Completely separate from the main Design Studio build —
// does not include three.js, fence/gate tools, or the wizard, so the bundle
// stays small and the attack surface is minimal.

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
require('dotenv').config();

module.exports = {
  mode: 'development',
  entry: './quiz-index.js',
  output: {
    path: path.resolve(__dirname, 'dist-quiz'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, use: { loader: 'babel-loader' } },
      { test: /\.(jpg|jpeg|png|gif|webp)$/i, type: 'asset/resource' },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './quiz-index.html' }),
    new CopyPlugin({
      patterns: [
        { from: 'quiz/assets', to: 'quiz/assets', noErrorOnMissing: true },
        { from: 'assets/logo-email.png', to: 'assets/logo-email.png', noErrorOnMissing: true },
        { from: 'assets/social-preview.png', to: 'assets/social-preview.png', noErrorOnMissing: true },
        { from: '_redirects', to: '_redirects' },
      ],
    }),
    new webpack.DefinePlugin({
      'process.env.QUIZ_STUDIO_ORIGIN': JSON.stringify(
        process.env.QUIZ_STUDIO_ORIGIN || 'https://studio.grandviewfence.com'
      ),
    }),
  ],
  devServer: {
    static: path.join(__dirname, '.'),
    port: 3001,
    historyApiFallback: true,
  },
};
