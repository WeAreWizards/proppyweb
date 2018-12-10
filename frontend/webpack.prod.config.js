var path = require("path");
var webpack = require("webpack");
var HtmlWebpackPlugin = require("html-webpack-plugin");
var package = require('./package.json');
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var CopyWebpackPlugin = require("copy-webpack-plugin");

const extractSass = new ExtractTextPlugin({
    filename: "app.css",
});

// Default to staging
var __API_BASE_URL__ = JSON.stringify(process.env.PROPPY_API_BASE_URL || "http://0.0.0.0:7777");
var __SITE_BASE_URL__ = JSON.stringify(process.env.PROPPY_SITE_BASE_URL || "http://0.0.0.0:3000");
var __SENTRY_DSN__ = JSON.stringify(process.env.PROPPY_SENTRY_DSN || "https://68eb32861b8a46bca0d542a36a131a39@sentry.wearewizards.io/15");
var __MIXPANEL_TOKEN__ = JSON.stringify(process.env.PROPPY_MIXPANEL_TOKEN || "ba1ffdaa6512aba4fb249e3df17707d9");
var __STRIPE_CLIENT_ID__ = JSON.stringify(process.env.PROPPY_STRIPE_CLIENT_ID || "ca_A7XMT6buFBj5sA0pfb36doNvgieACozb");


// Separates vendors and our app in 2 files
module.exports = {
  devtool: "source-map",
  entry: {
    app: "./src/app/index",
    vendors: Object.keys(package.dependencies)
  },
  output: {
    path: path.join(__dirname, "dist"),
    filename: "app.[chunkhash].js",
  },
  plugins: [
    extractSass,
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('production')
      },
      __PRODUCTION__: true,
      __DEVTOOLS__: false,
      __API_BASE_URL__: __API_BASE_URL__,
      __SITE_BASE_URL__: __SITE_BASE_URL__,
      __SENTRY_DSN__: __SENTRY_DSN__,
      __MIXPANEL_TOKEN__: __MIXPANEL_TOKEN__,
      __STRIPE_CLIENT_ID__: __STRIPE_CLIENT_ID__,
    }),
    new HtmlWebpackPlugin({
      template: "src/index.html",
    }),
    new webpack.ProvidePlugin({
      'fetch': 'imports?this=>global!exports-loader?global.fetch!whatwg-fetch'
    }),
    new CopyWebpackPlugin([
      {from: "src/img", to: "img/"}
    ]),
    new webpack.optimize.ModuleConcatenationPlugin(),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      }
    }),
    new webpack.optimize.CommonsChunkPlugin({name: 'vendors', filename: 'vendors.[chunkhash].js'})
  ],
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".json"]
  },
  module: {
    rules: [
      {
        enforce: "pre",
        test: /\.tsx?$/,
        loader: "tslint-loader",
        exclude: /node_modules/
      },
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.scss/,
        use: extractSass.extract({
          use: [
            {loader: "css-loader"},
            {
              loader: "postcss-loader",
              options: {
                plugins: function() {
                  return [
                    require('lost'),
                    require('autoprefixer')({ browsers: ["last 2 versions"] }),
                  ];
                }
              }
            },
            {
              loader: "sass-loader",
              options: {
                outputStyle: "compressed",
              }
            },
          ]
        }),
        exclude: /node_modules/,
        include: path.resolve(__dirname, 'src')
      }
    ]
  }
};
