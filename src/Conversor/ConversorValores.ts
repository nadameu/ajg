import ConversorMoeda from './ConversorMoeda';

const ConversorValores: Analisador<Valores> = {
	analisar(texto): Valores {
		const match = texto.match(/^([\d.,]+)\s+\(([\d.,]+) \+ ([\d.,]+)\)$/);
		if (!match || match.length !== 4) {
			throw new TypeError(`Valor não corresponde ao esperado: "${texto}".`);
		}
		let [, total, principal, juros] = match;
		return {
			principal: ConversorMoeda.analisar(principal),
			juros: ConversorMoeda.analisar(juros),
			total: ConversorMoeda.analisar(total),
		};
	},
};

export default ConversorValores;
