import Acoes from '../Acoes';
import BotaoAcao from '../BotaoAcao';
import { Mensagem } from '../Mensagem';
import Pagina from './Pagina';
import parseDecimalInt from '../Utils/parseDecimalInt';
import { lefts, rights } from '../Utils/promises';

class ExtendableError extends Error {
	constructor(message: string) {
		super(message);
		this.name = this.constructor.name;
		if (typeof Error.captureStackTrace === 'function') {
			Error.captureStackTrace(this, this.constructor);
		} else {
			this.stack = new Error(message).stack;
		}
	}
}

class LinkNotFoundError extends ExtendableError {}

const promiseIndex = <T>(index: number) => (collection: {
	length: number;
	[index: number]: T | undefined;
}) =>
	collection.length > index && collection[index] !== undefined
		? Promise.resolve(collection[index] as T)
		: Promise.reject(new Error(`Índice inexistente: ${index}.`));

const promiseTexto = (elemento: Element) => {
	const texto = elemento.textContent;
	return texto
		? Promise.resolve(texto)
		: Promise.reject(new Error(`Elemento não possui texto: ${elemento}`));
};

const obterCelulaLinha = (linha: HTMLTableRowElement, index: number) =>
	Promise.resolve(linha.cells as HTMLCollectionOf<HTMLTableCellElement>).then(
		promiseIndex(index)
	);

const makeObterFromLinha = (linha: HTMLTableRowElement) => {
	const obterCelula = (index: number) => obterCelulaLinha(linha, index);

	const obterElems = <T extends Element>(index: number, selector: string) =>
		obterCelula(index)
			.then(celula => celula.querySelectorAll<T>(selector))
			.then(collection => Array.from(collection));

	const obterNumero = (index: number) =>
		obterTexto(index).then(parseDecimalInt);

	const obterTexto = (index: number) =>
		obterCelula(index)
			.then(promiseTexto)
			.then(x => x.trim());

	return { obterElems, obterNumero, obterTexto };
};

const makeObterHref = (urls: URL[]) => (param: string, expected?: string) => {
	const filtradas = urls.filter(
		url => url.searchParams.get(param) === expected
	);
	return filtradas.length === 0
		? Promise.reject(
				new LinkNotFoundError(
					`Não há URL com o parâmetro "${param}" igual a "${expected}".`
				)
		  )
		: Promise.resolve(filtradas[0].href);
};

export default class PaginaListar extends Pagina {
	async adicionarAlteracoes() {
		const win = this.doc.defaultView;
		const opener = win.opener;
		await this.testarJanelaProcessoAberta();
		const requisicoes = await this.obterRequisicoes();
		return Promise.all(
			requisicoes.map(async requisicao => {
				const celula = await obterCelulaLinha(requisicao.linha, 2);
				const botao = BotaoAcao.criar('Verificar dados', evt => {
					evt.preventDefault();
					evt.stopPropagation();
					this.solicitarAberturaRequisicao(opener, requisicao);
				});
				celula.appendChild(this.doc.createTextNode(' '));
				celula.appendChild(botao);
				return requisicao.numero;
			})
		)
			.then(xs => xs.join(', '))
			.then(ns => `Adicionado(s) botão(ões) à(s) requisição(ões) ${ns}.`);
	}

	async obterRequisicao(linha: HTMLTableRowElement): Promise<RequisicaoListar> {
		const { obterNumero, obterTexto, obterElems } = makeObterFromLinha(linha);
		const numero = await obterNumero(0);
		const status = await obterTexto(1);
		const links = await obterElems<HTMLAnchorElement>(2, 'a[href]');
		const urls = links.map(link => new URL(link.href));
		const obterHref = makeObterHref(urls);
		const req: RequisicaoListar = {
			linha,
			numero,
			status,
			urlConsultar: await obterHref('acao', 'oficio_requisitorio_visualizar'),
			urlEditar: await obterHref(
				'acao',
				'oficio_requisitorio_requisicoes_editar'
			),
		};
		return req;
	}

	async obterRequisicoes() {
		const linhas = this.queryAll<HTMLTableRowElement>(
			'#divInfraAreaTabela > table tr[class^="infraTr"]'
		);
		const requisicoes = linhas.map(this.obterRequisicao);
		lefts(requisicoes).then(erros => {
			erros
				.filter(erro => !(erro instanceof LinkNotFoundError))
				.forEach(erro => {
					console.log('instanceof Error', erro instanceof Error);
					console.log(
						'instanceof LinkNotFound',
						erro instanceof LinkNotFoundError
					);
					console.warn(erro);
				});
		});
		return rights(requisicoes);
	}

	solicitarAberturaRequisicao(janela: Window, requisicao: RequisicaoListar) {
		const data: Mensagem = {
			acao: Acoes.ABRIR_REQUISICAO,
			requisicao: requisicao,
		};
		janela.postMessage(JSON.stringify(data), this.doc.location.origin);
	}

	async testarJanelaProcessoAberta() {
		const win = this.doc.defaultView;
		const opener: Window | null = win.opener;

		if (!opener || opener === win) {
			throw new Error('Janela do processo não está aberta.');
		}

		const demorouDemais = new Promise<never>((_, rej) => {
			setTimeout(rej, 3000, new Error('Janela do processo não respondeu.'));
		});

		const aguardarMensagem = new Promise<boolean>((res, rej) => {
			win.addEventListener(
				'message',
				({ origin, data }) => {
					if (origin === this.doc.location.origin) {
						const { acao } = JSON.parse(data);
						if (acao === Acoes.RESPOSTA_JANELA_ABERTA) {
							return res(true);
						}
					}
					rej(
						new Error(`Janela do processo não encontrada. ${origin}, ${data}`)
					);
				},
				{ once: true }
			);
		});

		const data: Mensagem = {
			acao: Acoes.VERIFICAR_JANELA,
		};
		opener.postMessage(JSON.stringify(data), this.doc.location.origin);

		return Promise.race([aguardarMensagem, demorouDemais]);
	}
}
