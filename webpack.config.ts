import CleanWebpackPlugin from 'clean-webpack-plugin';
import path from 'path';
import UglifyJsPlugin from 'uglifyjs-webpack-plugin';
import UserscriptMeta from 'userscript-meta';
import webpack from 'webpack';

import pkg from './package.json';
import metadata from './metadata';
import GenerateMetaFilePlugin from './lib/GenerateMetaFilePlugin';

const getMetadata = () => {
	const { name, description, version, author } = pkg;
	return Object.assign({ name, description, version, author }, metadata);
};

const defaultConfig: webpack.Configuration = {
	entry: path.resolve(__dirname, pkg.main),
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				exclude: /node_modules/,
				use: ['babel-loader', 'ts-loader'],
			},
			{
				test: /\.jsx?$/,
				exclude: /node_modules/,
				loader: 'babel-loader',
			},
			{
				test: /\.s?css$/,
				use: ['style-loader', 'css-loader', 'sass-loader'],
			},
			{
				test: /\.html$/,
				use: ['raw-loader'],
			},
		],
	},
	optimization: {
		minimizer: [],
	},
	output: {
		filename: `${pkg.name}.user.js`,
		path: path.resolve(__dirname, 'dist'),
		publicPath: '/',
	},
	plugins: [
		new webpack.BannerPlugin({
			banner: UserscriptMeta.stringify(getMetadata()),
			raw: true,
			entryOnly: true,
		}),
	],
	resolve: { extensions: ['.ts', '.js', '.json'] },
};

const devConfig: webpack.Configuration = Object.assign({}, defaultConfig, {
	devServer: {
		contentBase: './dist',
	},
});

const prodConfig: webpack.Configuration = Object.assign({}, defaultConfig, {
	plugins: [
		new CleanWebpackPlugin(['dist']),
		new UglifyJsPlugin({}),
		...(defaultConfig.plugins || []),
		new GenerateMetaFilePlugin({
			filename: `${pkg.name}.meta.js`,
			metadata: getMetadata(),
		}),
	],
});

interface Env {
	development?: boolean;
	production?: boolean;
}
const config = (env: Env = {}) => (env.production ? prodConfig : devConfig);

export default config;
