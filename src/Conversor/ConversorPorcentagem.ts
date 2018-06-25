const ConversorPorcentagem: Conversor<number> = {
	converter(valor) {
		return valor.toLocaleString('pt-BR', {
			style: 'percent',
			maximumFractionDigits: 6,
		});
	},
};

export default ConversorPorcentagem;
