import Padrao from './Padrao';

export default class AnalisadorLinhasTabela {
	private conversores: Analisadores = {};
	private readonly padroes: Padrao[];
	prefixo?: string;

	constructor(...padroes: Padrao[]) {
		this.padroes = padroes;
	}

	analisar(algo: HTMLTableElement) {
		return this.analisarInto(algo, {});
	}

	analisarInto(tabela: HTMLTableElement, obj: any) {
		if (this.prefixo) {
			tabela.classList.add(`${this.prefixo}__tabela`);
		}
		const changed = {};
		const linhas = Array.from(tabela.rows);
		linhas.forEach(linha => {
			const texto = linha.cells[0].innerHTML.trim();
			this.padroes.forEach(padrao => {
				const match = padrao.matchInto(texto, changed);
				if (this.prefixo && match) {
					for (let nome in match) {
						linha.classList.add(`${this.prefixo}__${nome}`);
					}
				}
			});
		});
		this.aplicarConversores(changed);
		Object.assign(obj, changed);
		return obj;
	}

	private aplicarConversores(obj: { [nome: string]: string }) {
		for (let nome in this.conversores) {
			if (!obj.hasOwnProperty(nome)) continue;
			let conversor = this.conversores[nome];
			obj[nome] = conversor.analisar(obj[nome]);
		}
	}

	definirConversores(conversores: Analisadores) {
		this.conversores = conversores;
	}
}
