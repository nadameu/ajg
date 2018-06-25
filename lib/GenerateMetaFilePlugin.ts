import { stringify } from 'userscript-meta';
import webpack from 'webpack';

export default class GenerateMetaFilePlugin implements webpack.Plugin {
	options: PluginOptions;

	constructor(options: PluginOptions) {
		this.options = options;
	}

	apply(compiler: webpack.Compiler) {
		const filename = this.options.filename;
		const text = stringify(this.options.metadata);
		compiler.hooks.emit.tap('GenerateMetaFilePlugin', compilation => {
			compilation.assets[filename] = {
				source: () => text,
				size: () => text.length,
			};
		});
	}
}
