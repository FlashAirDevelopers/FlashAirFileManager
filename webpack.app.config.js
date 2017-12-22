'use strict';

var webpack = require('webpack');
var path = require('path');
var {inspect} = require('util');

var BabelMinifyPlugin = require("babel-minify-webpack-plugin");
var CleanWebpackPlugin = require('clean-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

var isProduction = process.env.NODE_ENV === 'production';

var mainPlugins = [
    new CleanWebpackPlugin(['dist/main'])
];
var rendererPlugins = [
    new webpack.optimize.CommonsChunkPlugin({ name: 'vendor', filename: 'vendor.js', minChunks: Infinity }),
    new webpack.ProvidePlugin({
        $: 'jquery',
        jQuery: 'jquery',
        'window.jQuery': 'jquery',
        fetch: 'isomorphic-fetch'
    }),
    new webpack.NoEmitOnErrorsPlugin(),
    new ExtractTextPlugin('styles.css'),
    new webpack.IgnorePlugin(/vertx/),
    new CleanWebpackPlugin(['dist/renderer'])
];

if (isProduction) {
    // base optimize plugins
    var optimizePlugins = [
        new webpack.optimize.AggressiveMergingPlugin(),
        new webpack.optimize.OccurrenceOrderPlugin(),
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
        }),
        new BabelMinifyPlugin(),
    ];
    // Add both plugins main and renderer
    mainPlugins = mainPlugins.concat(optimizePlugins);
    rendererPlugins = rendererPlugins.concat(optimizePlugins);
}

var mainConfig = {
    cache: !isProduction,
    node: { __dirname: false, __filename: false },
    entry: {
        main: path.join(__dirname, 'src', 'main', 'main.js')
    },
    output: {
        path: path.join(__dirname, 'dist', 'main'),
        filename: '[name].js',
        libraryTarget: 'commonjs2'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                include: path.join(__dirname, 'node_modules'),
                loader: 'shebang-loader'
            },
            {
                test: /\.js$/,
                include: path.join(__dirname, 'src'),
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['es2015']
                    }
                }
            },
            {
                test: /\.node$/,
                include: path.join(__dirname, 'node_modules'),
                use: 'node-loader'
            }
        ]
    },
    resolve: {
        extensions: ['.js', '.json', '.node'],
    },
    externals: [
        'about-window',
        'keytar'
    ],
    target: 'electron-main',
    plugins: mainPlugins
};

var cssHotLoader = isProduction ? [] : ['css-hot-loader'];
var rendererConfig = {
    devtool: isProduction ? false : 'eval-source-map',
    cache: !isProduction,
    node: { __dirname: false, __filename: false },
    entry: {
        vendor: [
            'jquery',
            'bootstrap',
            'bootstrap/dist/css/bootstrap.min.css',
            'bootstrap-select',
            'bootstrap-select/dist/css/bootstrap-select.min.css',
            'bootstrap-notify',
            'handlebars/dist/handlebars.runtime.min.js',
            'spin.js',
            'isomorphic-fetch',
            'electron-log'
        ],
        renderer: path.join(__dirname, 'src', 'renderer', 'index.js')
    },
    output: {
        path: path.join(__dirname, 'dist', 'renderer'),
        filename: '[name].js',
        libraryTarget: 'commonjs2'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                include: path.join(__dirname, 'node_modules'),
                loader: 'shebang-loader'
            },
            {
                test: /\.js$/,
                include: path.join(__dirname, 'src'),
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['es2015']
                    }
                }
            },
            {
                test: /\.hbs$/,
                exclude: /node_modules/,
                use: {
                    loader: 'handlebars-loader'
                }
            },
            {
                test: /\.node$/,
                include: path.join(__dirname, 'node_modules'),
                loader: 'node-loader'
            },
            {
                test: /\.css$/,
                use: cssHotLoader.concat(ExtractTextPlugin.extract({
                    use: 'css-loader',
                    fallback: 'style-loader',
                })),
            },
            {
                test: /\.less$/,
                use: cssHotLoader.concat(ExtractTextPlugin.extract({
                    use: [
                    {loader: 'css-loader'},
                    {loader: 'less-loader'}
                    ],
                    fallback: 'style-loader'
                }))
            },
            {
                test: /\.scss/,
                use: cssHotLoader.concat(ExtractTextPlugin.extract({
                    use: [
                    {loader: 'css-loader'},
                    {loader: 'sass-loader'}
                    ],
                    fallback: 'style-loader'
                }))
            },
            { test: /\.svg$/, loader: 'url-loader?mimetype=image/svg+xml' },
            { test: /\.woff$/, loader: 'url-loader?mimetype=application/font-woff' },
            { test: /\.woff2$/, loader: 'url-loader?mimetype=application/font-woff' },
            { test: /\.eot$/, loader: 'url-loader?mimetype=application/font-woff' },
            { test: /\.ttf$/, loader: 'url-loader?mimetype=application/font-woff' }, 
            { test: /\.json$/, use: 'json-loader'}
        ]
    },
    resolve: {
        extensions: ['.js', '.css', '.json', '.hbs', '.svg', '.woff', '.woff2', '.eot', '.ttf'],
        alias: {
            'handlebars': 'handlebars/dist/handlebars.runtime.min.js'
        }
    },
    externals: [
        '@openid/appauth',
        'about-window',
        'electron-log',
        'handlebars',
        'isomorphic-fetch',
        'js-base64',
        'jssha',
        'keytar'
    ],
    target: 'electron-renderer',
    plugins: rendererPlugins
};

console.log(inspect([mainConfig, rendererConfig], {
    showHidden: false,
    depth: null,
    colors: true
}));
module.exports = [mainConfig, rendererConfig];
