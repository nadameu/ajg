const ConversorMoeda: AnalisadorConversor<number> = {
	analisar(texto) {
		return parseFloat(texto.replace(/\./g, '').replace(/,/, '.'));
	},
	converter(valor) {
		return valor.toLocaleString('pt-BR', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
	},
};

export default ConversorMoeda;
