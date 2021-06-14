const path = require('path');
const TerserPlugin = require("terser-webpack-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {

    let isDev = argv.mode === 'development';

    let config = {
        entry: './src/index.js',
        output: {
            filename: isDev ? 'main.js' : 'main.[contenthash].js',
            path: path.resolve(__dirname, '../static/influence'),
        },
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
        ],
    };

    return config;
};