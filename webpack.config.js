/*
 *
 *  Copyright 2016 Yann Massard (https://github.com/yamass) and other contributors
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

var path = require('path');
var webpack = require('webpack');
var merge = require('webpack-merge');
var UglifyJsPlugin = require('uglifyjs-webpack-plugin');
var MiniCssExtractPlugin = require("mini-css-extract-plugin");
var OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
var CleanWebpackPlugin = require('clean-webpack-plugin');

var baseConfig = {
	entry: './src/index.ts',
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'trivial-components.js',
		libraryTarget: 'umd',
		library: 'TrivialComponents'
	},
	resolve: {
		extensions: ['.ts', '.tsx', '.less', '.css', '.js']
	},
	optimization: {
		minimize: false // overwritten below
	},
	devtool: 'source-map',
	module: {
		rules: [{
			test: /\.tsx?$/,
			loader: 'awesome-typescript-loader',
			exclude: /node_modules/
		}, {
			test: /\.less$/,
			use: [
				MiniCssExtractPlugin.loader,
				{
					loader: "css-loader",
					options: {
						sourceMap: true
					}
				}, {
					loader: 'postcss-loader',
					options: {
						sourceMap: true,
						plugins: (loader) => [require('autoprefixer')({browsers: ['> 1%', 'IE 11']})],
					}
				}, {
					loader: "less-loader",
					options: {
						sourceMap: true
					}
				}]
		}]
	},
	externals: {
		"jquery": {
			commonjs: "jquery",
			commonjs2: "jquery",
			amd: "jquery",
			root: "jQuery"
		},
		"levenshtein": {
			commonjs: "levenshtein",
			commonjs2: "levenshtein",
			amd: "levenshtein",
			root: "Levenshtein"
		},
		"moment": "moment",
		"moment-timezone": "moment"
	},
	plugins: [
		new CleanWebpackPlugin(['dist'])
	]
};

module.exports = [
	merge(baseConfig, {
		plugins: [
			new MiniCssExtractPlugin({
				filename: "trivial-components.css"
			})
		]
	}),
	merge(baseConfig, {
		output: {
			filename: 'trivial-components.min.js'
		},
		optimization: {
			minimize: true,
			minimizer: [new UglifyJsPlugin({
				sourceMap: true,
				uglifyOptions: {
					output: {
						comments: false,
						beautify: false
					}
				}
			})]
		},
		plugins: [
			new MiniCssExtractPlugin({
				filename: "trivial-components.min.css"
			}),
			new OptimizeCssAssetsPlugin({
				assetNameRegExp: /\.css$/,
				cssProcessor: require('cssnano'),
				cssProcessorOptions: {
					discardComments: {removeAll: true},
					sourcemap: true,
					map: {
						inline: false
					}
				},
				canPrint: true
			})
		]
	})
];
