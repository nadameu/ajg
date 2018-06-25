import parseDecimalInt from '../Utils/parseDecimalInt';

const ConversorInt: AnalisadorConversor<number> = {
	analisar(texto) {
		return parseDecimalInt('0' + texto);
	},

	converter(valor) {
		return valor.toString();
	},
};

export default ConversorInt;
