const webpack = require('webpack');
const path = require('path');

const MiniCssExtractPlugin = require("mini-css-extract-plugin");


const config = {
	node: { // we currently need this to prevent warnings from appearing...
		fs: "empty",
		module: "empty"
	},
	resolve: {
		extensions: ['.ts', '.json', '.less', '.css', '.js']
	},

	output: {
		filename: '[name].bundle.js',
		path: path.resolve(__dirname, "..", 'dist'),
		publicPath: '/dist/'
	},

	module: {
		rules: [
			{
				test: /\.tsx?$/,
				loader: "awesome-typescript-loader",
				options: {
					configFileName: './ts/tsconfig.json'
				}
			},
			{
				test: /\.(less|css)$/,
				use: [
					MiniCssExtractPlugin.loader,
					{
						loader: 'css-loader',
						options: {
							sourceMap: true
						}
					},
					{
						loader: 'less-loader',
						options: {
							sourceMap: true
						}
					}
				]
			}, {
				test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
				loader: 'url-loader',
				options: {
					limit: 10000,
					name: 'img/[name].[hash:7].[ext]'
				}
			},
			{
				test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
				loader: 'url-loader',
				options: {
					limit: 10000,
					name: 'media/[name].[hash:7].[ext]'
				}
			},
			{
				test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
				loader: 'url-loader',
				options: {
					limit: 10000,
					name: 'fonts/[name].[hash:7].[ext]'
				}
			},
		]
	},


	plugins: [
		new MiniCssExtractPlugin({
			filename: "[name].css",
			chunkFilename: "[id].css"
		}),
		new webpack.IgnorePlugin(/^((fs)|(path)|(os)|(crypto)|(source-map-support))$/, /vs\/language\/typescript\/lib/),
		new webpack.ContextReplacementPlugin(
			new RegExp('^' + path.dirname(require.resolve('monaco-editor/esm/vs/editor/common/services/editorSimpleWorker')) + '$'),
			'',
			{
				'vs/language/css/cssWorker': require.resolve('monaco-editor/esm/vs/language/css/cssWorker'),
				'vs/language/html/htmlWorker': require.resolve('monaco-editor/esm/vs/language/html/htmlWorker'),
				'vs/language/json/jsonWorker': require.resolve('monaco-editor/esm/vs/language/json/jsonWorker'),
				'vs/language/typescript/tsWorker': require.resolve('monaco-editor/esm/vs/language/typescript/tsWorker')
			}
		)
	]
};

module.exports = {
	app: Object.assign({}, config, {
		name: 'main',
		target: 'web',
		entry: {
			"main": './ts/demo'
		},
		output: Object.assign({}, config.output, {
			filename: 'main.bundle.js'
		})
	}),
	workers: Object.assign({}, config, {
		name: 'worker',
		target: 'webworker',
		entry: {
			'editor': 'monaco-editor/esm/vs/editor/editor.worker.js',
			'json': 'monaco-editor/esm/vs/language/json/json.worker.js',
			'css': 'monaco-editor/esm/vs/language/css/css.worker.js',
			'html': 'monaco-editor/esm/vs/language/html/html.worker.js',
			'ts': 'monaco-editor/esm/vs/language/typescript/ts.worker.js'
		},
		output: Object.assign({}, config.output, {
			filename: '[name].worker.bundle.js'
		})
	})
}
