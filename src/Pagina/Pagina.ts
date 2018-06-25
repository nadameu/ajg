import * as Option from 'fp-ts/lib/Option';

export default abstract class Pagina {
	protected doc: Document;
	constructor(doc: Document) {
		this.doc = doc;
	}

	abstract adicionarAlteracoes(): Promise<any>;

	queryAll<T extends Element>(
		selector: string,
		context: NodeSelector = this.doc
	) {
		return Array.from(context.querySelectorAll<T>(selector));
	}

	query<T extends Element>(selector: string, context: NodeSelector = this.doc) {
		const elemento = context.querySelector<T>(selector);
		if (elemento === null) {
			return Promise.reject(
				new Error(`Elemento não encontrado: "${selector}".`)
			);
		}
		return Promise.resolve(elemento);
	}

	queryOption<T extends Element>(
		selector: string,
		context: NodeSelector = this.doc
	) {
		return Option.fromNullable(context.querySelector<T>(selector));
	}

	queryTexto<T extends Element>(
		selector: string,
		context: NodeSelector = this.doc
	) {
		return this.query<T>(selector, context).then(elemento => {
			const texto = elemento.textContent;
			return texto
				? Promise.resolve(texto)
				: Promise.reject(`Elemento não possui texto: ${selector}.`);
		});
	}

	validarElemento(
		selector: string,
		condicao?: boolean,
		classeTrue = 'gm-resposta--correta',
		classeFalse = 'gm-resposta--incorreta',
		classeUndefined = 'gm-resposta--indefinida'
	) {
		const elemento = this.doc.querySelector(selector);
		if (!elemento) throw new Error(`Elemento não encontrado: ${selector}`);
		elemento.classList.add('gm-resposta');
		if (condicao === true) {
			elemento.classList.add(classeTrue);
		} else if (condicao === false) {
			elemento.classList.add(classeFalse);
		} else if (typeof condicao === 'undefined') {
			elemento.classList.add(classeUndefined);
		}
	}
}
