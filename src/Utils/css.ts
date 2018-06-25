export default function css(obj: CSSInstructions) {
	return Array.from(Object.keys(obj))
		.map(selector => {
			const rules = obj[selector];
			return [
				`${selector} {`,
				Array.from(Object.keys(rules))
					.map(property => {
						const value = rules[property];
						return `\t${property}: ${value};`;
					})
					.join('\n'),
				'}',
			].join('\n');
		})
		.join('\n');
}
