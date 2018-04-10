const merge = require('webpack-merge');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const CompressionWebpackPlugin = require('compression-webpack-plugin');

const common = require('./webpack.common.js');

let plugins = [
	new UglifyJSPlugin({
		// sourceMap: true,
		uglifyOptions: {
			mangle: {
				reserved: "require"
			}
		}
	}),
	new CompressionWebpackPlugin({
		asset: '[path].gz[query]',
		algorithm: 'gzip',
		test: new RegExp('\\.(js|css)$'),
		threshold: 10240,
		minRatio: 0.8
	})
];
module.exports = [
	merge(common.app, {
		// devtool: 'source-map',
		plugins: plugins
	}),
	merge(common.workers, {
		// devtool: 'source-map',
		plugins: plugins
	})
];