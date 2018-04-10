const merge = require('webpack-merge');

const common = require('./webpack.common.js');

module.exports = [
	merge(common.app, {
		devtool: 'cheap-module-eval-source-map'
	}),
	merge(common.workers, {
		devtool: 'cheap-module-eval-source-map'
	})
];
