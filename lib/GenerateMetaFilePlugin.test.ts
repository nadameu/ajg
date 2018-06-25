import webpack from 'webpack';
import GenerateMetaFilePlugin from './GenerateMetaFilePlugin';

describe('GenerateMetaFilePlugin', () => {
	it('Possui um construtor', () => {
		expect(typeof GenerateMetaFilePlugin).toBe('function');
		expect(GenerateMetaFilePlugin.prototype.constructor).toBe(
			GenerateMetaFilePlugin
		);
	});

	it('Possui um método apply', () => {
		expect(typeof GenerateMetaFilePlugin.prototype.apply).toBe('function');
	});

	it('Adiciona um plugin à fase de emissão do webpack', () => {
		const options = {
			filename: 'test.meta.js',
			metadata: {
				name: 'test',
			},
		};
		const expected = '// ==UserScript==\n// @name test\n// ==/UserScript==\n';
		const plugin = new GenerateMetaFilePlugin(options);
		const compilation: Partial<webpack.compilation.Compilation> = {
			assets: {},
		};
		const compiler: {
			hooks: {
				emit: {
					tap: (
						name: string,
						fn: (compilation: webpack.compilation.Compilation) => any
					) => any;
				};
			};
		} = {
			hooks: {
				emit: {
					tap(name, fn) {
						expect(name).toBe('GenerateMetaFilePlugin');
						expect(typeof fn).toBe('function');
						fn(compilation as webpack.compilation.Compilation);
						const addedAsset = compilation.assets[options.filename];
						expect(addedAsset).not.toBeUndefined();
						const { source, size } = addedAsset;
						expect(source()).toBe(expected);
						expect(size()).toBe(expected.length);
					},
				},
			},
		};
		plugin.apply(compiler as webpack.Compiler);
	});
});
