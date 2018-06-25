const ConversorBool: AnalisadorConversor<boolean | undefined> = {
	analisar(texto) {
		return texto === '' ? undefined : texto === 'Sim';
	},
	converter(valor) {
		return valor ? 'Sim' : 'Não';
	},
};

export default ConversorBool;
