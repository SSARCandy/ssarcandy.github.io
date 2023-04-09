'use strict';

const path = require('path');
const NODE_ENV = process.env.NODE_ENV || 'development';
const THEME_DIR = path.join(__dirname, 'themes/ssarcandy');
const isProd = NODE_ENV === 'production';

module.exports = {
  mode: NODE_ENV,
  devtool: isProd ? false : 'cheap-module-source-map',
  entry: {
    app: path.join(THEME_DIR, 'js/App.js'),
    projectPage: path.join(THEME_DIR, 'js/ProjectPage.js'),
  },
  output: {
    filename: 'js/[name].bundle.js',
    path: path.join(THEME_DIR, 'source'),
    publicPath: '/'
  },
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
  ]
};
