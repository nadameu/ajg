import parseDecimalInt from '../Utils/parseDecimalInt';

const ConversorAno: AnalisadorConversor<Date> = {
	analisar(texto) {
		const match = texto.match(/^\d{4}$/);
		if (!match || match.length !== 1) {
			throw new TypeError(`Valor não corresponde a um ano: "${texto}".`);
		}
		const [y] = match;
		return new Date(parseDecimalInt(y), 0, 1);
	},
	converter(valor) {
		return valor.getFullYear().toString();
	},
};
export default ConversorAno;
