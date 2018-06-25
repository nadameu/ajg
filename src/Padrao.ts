export default class Padrao {
	regularExpression: RegExp;
	properties: string[];

	constructor(re: RegExp, ...props: string[]) {
		this.regularExpression = re;
		this.properties = props;
	}

	match(texto: string) {
		const obj = {};
		this.matchInto(texto, obj);
		return obj;
	}

	matchInto(texto: string, obj: any) {
		const changed: { [nome: string]: string } = {};
		const match = texto.match(this.regularExpression);
		if (match) {
			const valores = match.slice(1);
			this.properties.forEach((nome, indice) => {
				const valor = valores[indice];
				changed[nome] = valor;
			});
			Object.assign(obj, changed);
			return changed;
		}
		return null;
	}
}
