'use strict';

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const NODE_ENV = process.env.NODE_ENV || 'development';
const THEME_DIR = path.join(__dirname, 'themes/ssarcandy');
const isProd = NODE_ENV === 'production';

module.exports = {
  mode: NODE_ENV,
  devtool: isProd ? '' : 'cheap-module-source-map',
  entry: {
    app: path.join(THEME_DIR,'js/App.js'),
    projectPage: path.join(THEME_DIR, 'js/ProjectPage.js'),
  },
  output: {
    filename: 'js/[name].bundle.js',
    path: path.join(THEME_DIR, 'source'),
    publicPath: '/'
  },
  // optimization: {
  //   runtimeChunk: 'single',
  //   moduleIds: 'hashed',
  //   splitChunks: {
  //     chunks: 'all'
  //   }
  // },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
            presets: [
              ['@babel/preset-env', {
                useBuiltIns: 'usage',
                corejs: {
                  version: 3,
                  proposals: true
                }
              }]
            ]
          }
        }
      },
    ]
  },
  plugins: [
    // new CleanWebpackPlugin({
    //     cleanAfterEveryBuildPatterns: [
    //       path.join(THEME_DIR, 'source/**/*.ejs')
    //     ]
    // }),  
    // new HtmlWebpackPlugin({
    //     filename: 'layout.ejs',
    //     template: path.join(THEME_DIR, 'layout/_layout.ejs'),
    //     alwaysWriteToDisk: true,
    //     scriptLoading: 'defer'
    //   }),
  ]
};
