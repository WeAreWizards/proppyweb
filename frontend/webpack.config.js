var path = require("path");
var webpack = require("webpack");
var HtmlWebpackPlugin = require("html-webpack-plugin");
var BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
var CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  devtool: "cheap-module-source-map",
  entry: [
    "react-hot-loader/patch",
    "webpack-dev-server/client?http://localhost:3000",
    "webpack/hot/only-dev-server",
    "./src/app/index",
  ],
  output: {
    path: path.join(__dirname, "build"),
    filename: "app.js",
    publicPath: "/static/"
  },
  plugins: [
    //new BundleAnalyzerPlugin(),
    new webpack.NamedModulesPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.DefinePlugin({
      __PRODUCTION__: false,
      __DEVTOOLS__: true,
      __API_BASE_URL__: JSON.stringify("http://0.0.0.0:7777"),
      __SITE_BASE_URL__: JSON.stringify("http://0.0.0.0:3000"),
      __MIXPANEL_TOKEN__: JSON.stringify("ba1ffdaa6512aba4fb249e3df17707d9"),
      __STRIPE_CLIENT_ID__: JSON.stringify("ca_A7XMT6buFBj5sA0pfb36doNvgieACozb"),
    }),
    new HtmlWebpackPlugin({
      template: "src/index.html",
    }),
    new webpack.ProvidePlugin({
      'window.fetch': 'exports-loader?self.fetch!whatwg-fetch'
    }),
    new webpack.LoaderOptionsPlugin({
      options: {
        tslint: {
          configFile: "tslint.json"
        }
      }
    }),
    new CopyWebpackPlugin([
      {from: "src/img", to: "img/"}
    ]),
    new webpack.optimize.ModuleConcatenationPlugin()
  ],
  devServer: {
    hot: true,
    contentBase: path.resolve(__dirname, "build"),
    port: 3000,
    stats: "minimal",
    inline: true,
    disableHostCheck: true,
    noInfo: true,
    historyApiFallback: {
      disableDotRule: true,
    }
  },
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
        loaders: [
          "react-hot-loader/webpack",
          "ts-loader",
        ],
        exclude: /node_modules/
      },
      {
        test: /\.scss/,
        loader: [
            {loader: "style-loader"},
            {loader: "css-loader"},
            {
              loader: "postcss-loader",
              options: {
                plugins: function() {
                  return [
                    require('lost'),
                    require('autoprefixer')({ browsers: ["last 2 versions"] })
                  ];
                }
              }
            },
            {loader: "sass-loader"},
        ],
        exclude: /node_modules/,
        include: path.resolve(__dirname, 'src')
      }
    ]
  }
};
