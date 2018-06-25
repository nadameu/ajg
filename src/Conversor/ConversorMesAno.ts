import parseDecimalInt from '../Utils/parseDecimalInt';

const ConversorMesAno: AnalisadorConversor<Date> = {
	analisar(texto) {
		const match = texto.match(/^(\d{2})\/(\d{4})$/);
		if (!match || match.length !== 3) {
			throw new TypeError(`Valor não corresponde a um mês/ano: "${texto}".`);
		}
		let [, m, y] = match;
		return new Date(parseDecimalInt(y), parseDecimalInt(m) - 1, 1);
	},
	converter(valor) {
		return valor.toLocaleDateString('pt-BR', {
			month: 'numeric',
			year: 'numeric',
		});
	},
};

export default ConversorMesAno;
