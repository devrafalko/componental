const webpack = require("webpack");
const path = require('path');
const testDOM = process.env.NODE_ENV === "test-dom";
const production = process.env.NODE_ENV === "built-p";
const development = process.env.NODE_ENV === "built";

/* plugins */
const CssPlugin = require("extract-text-webpack-plugin");
const CleanPlugin = require('clean-webpack-plugin');
const DeferPlugin = require('script-ext-html-webpack-plugin');
const UglifyPlugin = require('uglifyjs-webpack-plugin');

/* helpers */
const htmlConfig = require('./helpers/modules/htmlConfig');
const entries = require('./helpers/modules/setEntries');
const aliases = require('./helpers/modules/setAliases');

/* defaults */
const PublicPath = "/";

/* html */
const html = require('./helpers/modules/htmlSettings');
const devOptions = {
  host:'localhost',
  port:8080,
  entry:html.init,
  url: function(){
    return 'http://'+this.host+':'+this.port+'/'+this.entry+'.html';
  }
};

module.exports = {
  context: path.resolve(__dirname,'src'),
  entry: entries,
  output:{
    path: path.resolve(__dirname,'dist'),
    filename: production ? "js/[name]_[chunkhash].js":"js/[name]_[id].js",
    publicPath:PublicPath,
    hashDigestLength:7,
    library: "MyLibrary"
  },
  devServer: {
    contentBase: path.join(__dirname,'dist/'),
    publicPath: '/',
    port: devOptions.port,
    host: devOptions.host,
    historyApiFallback: false,
    noInfo: false,
    overlay: true,
    stats: 'minimal',
    clientLogLevel: "info" //none, error, warning, info
  },
  node: {
    path: true,
    url: true,
    global: true,
    process: true,
    __filename: true,
    __dirname: true
  },
  watch: !production,
  stats: testDOM ? false:{
    version: false,
    colors: true,
    warnings: false,
    assets: true,
    cached: false,
    cachedAssets: false,
    children: false,
    chunks: false,
    chunkModules: false,
    chunkOrigins: false,
    depth: false,
    entrypoints: false,
    errors: true,
    errorDetails: true,
    hash: false,
    modules: false,
    providedExports: false,
    publicPath: false,
    timings: true,
    usedExports: false
  },
  module: {
    rules: [
      {
        test: /\.js$/i,
        exclude:/(node_modules)/,
        loader:"babel-loader",
        options:{
          presets:["env"]
        }
      },
      {
        test: /\.tsx?$/i,
        exclude: /node_modules/,
        loader: "ts-loader",
        options:{
          silent:true
        }
      },
      {
        test: /\.json$/i,
        use:[
          {
            loader: 'file-loader',
            options:{
              name: "[name]_[hash:5].[ext]",
              outputPath: 'ajax/'
            }
          }
        ]
      },
      {
        test: /\.html$/i,
        exclude:/((helpers(\\|\/)templates(\\|\/).+)|(entry))\.html$/,
        use: [
          {
            loader: 'file-loader',
            options:{
              name: "[name]_[hash:5].[ext]",
              outputPath: 'ajax/'
            }
          },
          {
            loader: 'extract-loader'
          },
          {
            loader: 'html-loader',
            options: {
              attrs: ['img:src', 'link:href'],
              minimize: production,
              removeComments: production,
              collapseWhitespace: production,
              minifyJS: production,
              minifyCSS: production,
              interpolate:'require'
            }
          }
        ]
      },
      {
        test: /\.(jpe?g|png|gif|svg)$/i,
        use:[
          {
            loader:"file-loader",
            options:{
              name: "[name]_[hash:5].[ext]",
              outputPath: 'images/'
            }
          },
          {
            loader: 'image-webpack-loader',
            options:{
              gifsicle:{
                interlaced:false,
                optimizationLevel:1,	//1-3
                colors:256	//2-256
              },
              mozjpeg:{
                quality:100,	//0-100
                progressive:true,
                smooth:0 //0-100
              },
              pngquant:{
                quality:production ? '70':'100', //'0'-'100'
                floyd:0.5,	//0-1
                speed:production ? 1:10	//1-10
              },
              svgo:{
                plugins:[
                  {removeDoctype:production},
                  {removeComments:production},
                  {removeMetadata:production},
                  {removeTitle:production},
                  {removeEmptyAttrs:production},
                  {removeEmptyText:production},
                  {convertColors:production}
                ]
              }
            }
          }
        ]
      },
      {
        test: /\.(woff(2)?|ttf|eot)(\?v=[0-9]\.[0-9]\.[0-9])?$/i,
        loader: "url-loader",
        options:{
          limit:10000,
          name: "[name]_[hash:5].[ext]",
          outputPath:'fonts/'
        }
      },
      {
        test: /\.s?css$/i,
        use: CssPlugin.extract({
          use: [
            {
              loader: "css-loader",
              options: {
                minimize:production,
                alias:aliases,
                camelCase:true  //import {className} from "styles.css"
              }
            },
            {
              loader: "sass-loader"
            }
          ]
        })
      }
    ]
  },
  resolve:{
    extensions: ['.js','.ts','.tsx','json','.html','.scss','.css','.png','.jpeg','.jpg','.gif','.svg','.ttf','.eot','.woff','.woff2'],
    alias: aliases
  },
  plugins: [
    new CleanPlugin(
      ['dist/**/*.*'],
      {
        root: __dirname,
        verbose: false,
        dry: false,
        exclude: [],
        watch: false
      }
    ),
    new webpack.optimize.CommonsChunkPlugin({
      name: "commons",
      filename: production ? "js/[name]_[chunkhash].js":"js/[name]_[id].js",
      minChunks: function (module) {
        return module.context && module.context.indexOf('node_modules') !== -1;
      }
      //chunks:['index','contact']
    }),
    new webpack.optimize.CommonsChunkPlugin({
      names:'manifest',
      filename: production ? "js/[name]_[chunkhash].js":"js/[name]_[id].js"
    }),
    new webpack.ProvidePlugin({
      path:'path',
      "_":'lodash',
      $: "jquery",
      jQuery: "jquery"
    }),
    new DeferPlugin({
      defaultAttribute: 'defer'
    }),
    new CssPlugin({
      filename: production ? "css/[name]_[contenthash:7].css":"css/[name]_[id].css",
      allChunks:true,
      disable:false,
      ignoreOrder:false
    }),
    new UglifyPlugin({
      compress:production,
      mangle:production,
      beautify:!production
    })
  ].concat(htmlConfig(devOptions))
};