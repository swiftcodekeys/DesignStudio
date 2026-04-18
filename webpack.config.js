const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
require('dotenv').config();

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
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
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
        { from: 'styles.css', to: 'styles.css' },
        { from: 'landing.css', to: 'landing.css' },
        { from: 'wizard.css', to: 'wizard.css' },
        { from: '_redirects', to: '_redirects' },
        { from: 'docs/research/how-to-measure-yard-for-fence-guide.md', to: 'docs/how-to-measure-yard-for-fence-guide.md' },
        { from: 'assets/slope-guides', to: 'assets/slope-guides' },
      ]
    }),
    new webpack.DefinePlugin({
      'process.env.GAS_ENDPOINT': JSON.stringify(''),
      'process.env.STRIPE_PUBLISHABLE_KEY': JSON.stringify(''),
      'process.env.GOOGLE_MAPS_API_KEY': JSON.stringify(process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || ''),
      'process.env.ANTHROPIC_API_KEY': JSON.stringify(''),
      'process.env.USE_MAPBOX_DRAW': JSON.stringify(process.env.USE_MAPBOX_DRAW === 'true'),
      'process.env.MAPBOX_ACCESS_TOKEN': JSON.stringify(process.env.MAPBOX_ACCESS_TOKEN || ''),
      'process.env.PARCEL_PROXY_URL': JSON.stringify(process.env.PARCEL_PROXY_URL || 'https://grandview-parcel-proxy.sarah-13a.workers.dev'),
    })
  ],
  devServer: {
    static: path.join(__dirname, '.'),
    port: 3000,
    open: true,
    historyApiFallback: true
  }
};
