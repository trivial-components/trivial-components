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
var UglifyJsPlugin = require('uglifyjs-webpack-plugin')


var baseConfig = {
	entry: './src/index.ts',
	output: {
		path: path.resolve(__dirname, 'dist/js'),
		filename: 'trivial-components.js',
		libraryTarget: 'umd',
		library: 'TrivialComponents'
	},
	resolve: {
		extensions: ['.ts', '.tsx', '.js']
	},
	optimization: {
		minimize: false
	},
	devtool: 'source-map',
	module: {
		rules: [{
			test: /\.tsx?$/,
			loader: 'awesome-typescript-loader',
			exclude: /node_modules/
		}]
	},
	externals: {
		"jquery": "jQuery",
		"levenshtein": "Levenshtein",
		"moment": "moment",
		"moment-timezone": "moment"
	}
};

module.exports = [
	baseConfig,
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
		}
	})
];
