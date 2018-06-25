import parseDecimalInt from '../Utils/parseDecimalInt';

const ConversorData: AnalisadorConversor<Date> = {
	analisar(texto) {
		const match = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
		if (!match || match.length !== 4) {
			throw new TypeError(`Valor não corresponde a uma data: "${texto}".`);
		}
		let [, d, m, y] = match;
		return new Date(
			parseDecimalInt(y),
			parseDecimalInt(m) - 1,
			parseDecimalInt(d)
		);
	},
	converter(valor) {
		return valor.toLocaleDateString('pt-BR');
	},
};

export default ConversorData;
