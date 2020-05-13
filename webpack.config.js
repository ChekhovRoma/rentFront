const ps = require('path');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');

module.exports = {
    context: ps.resolve(__dirname, 'src'),
    mode: 'development',
    entry: {
        main: './index.js'
    },
    output: {
        filename: "[name].[contenthash].js",
        path: ps.resolve(__dirname, 'dist')
    },
    node:{
        fs: 'empty'
    },
    devServer: {
        contentBase: './dist',
    },
    plugins: [
        new HTMLWebpackPlugin({
            template: './index.html'
        }),
        new CleanWebpackPlugin()
    ],
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ['style-loader','css-loader']
            }
        ]
    }
}
