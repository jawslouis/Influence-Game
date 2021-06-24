const path = require('path');
const TerserPlugin = require("terser-webpack-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {

    let isDev = argv.mode === 'development';

    let config = {
        entry: './src/index.js',
        output: {
            filename: isDev ? 'main.js' : 'main.[contenthash].js',
            path: path.resolve(__dirname, '../static/influence'),
            clean: true,
            // publicPath: '/static/',
        },
        devtool: 'cheap-module-eval-source-map',
        optimization: {
            minimize: true,
            minimizer: [new TerserPlugin()],
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: './src/index.html',
                filename: '../../templates/influence/index.html',
                inject: false,
            }),
            new MiniCssExtractPlugin({
                filename: isDev ? '[name].css' : '[name].[contenthash].css',
                // filename: '[name].[contenthash].css',
            }),
        ],
        module: {
            rules: [
                {
                    test: /\.css$/i,
                    use: [MiniCssExtractPlugin.loader, {loader: 'css-loader', options: {url: false}}],
                },
            ],
        }
    };

    return config;
};