import BotaoAcao from '../BotaoAcao';
import Pagina from './Pagina';
import { ConversorData } from '../Conversor';

type DadosPaginacao = {
	caption: HTMLTableCaptionElement;
	form: HTMLFormElement;
	paginaAtual: HTMLInputElement;
	paginacaoSuperior: HTMLDivElement;
	paginacaoInferior: HTMLDivElement;
	paginas: number;
	registros: number;
	tBody: HTMLTableSectionElement;
};

type DadosOficios = {
	linhas: HTMLTableRowElement[];
	tabela: HTMLTableElement;
	urls: string[];
};

export default class PaginaOficioRequisitorioListar extends Pagina {
	private _isLoadingPages = false;
	private _isLoadingDates = false;

	async adicionarAlteracoes() {
		const barra = await this.query<HTMLDivElement>(
			'#divInfraBarraComandosSuperior'
		);
		const fragment = this.doc.createDocumentFragment();
		await this.adicionarBotaoCarregarPaginas().then(
			botaoCarregarPaginas => {
				fragment.appendChild(botaoCarregarPaginas);
				botaoCarregarPaginas.insertAdjacentHTML('afterend', '&nbsp;\n');
			},
			err => {
				if (!(err instanceof NaoCarregarOutrasPaginasError)) throw err;
			}
		);
		const botaoOrdenar = this.adicionarBotaoOrdenar();
		fragment.appendChild(botaoOrdenar);
		botaoOrdenar.insertAdjacentHTML('afterend', '&nbsp;\n');
		const botaoLimparCache = this.adicionarBotaoLimparCache();
		fragment.appendChild(botaoLimparCache);
		botaoLimparCache.insertAdjacentHTML('afterend', '&nbsp;\n');
		barra.insertBefore(fragment, barra.firstChild);
	}

	async adicionarBotaoCarregarPaginas() {
		const dadosPaginacao = await this.obterDadosPaginacao();
		return BotaoAcao.criar(
			'Carregar todas as páginas',
			this.onBotaoCarregarPaginasClicked.bind(this, dadosPaginacao)
		);
	}

	adicionarBotaoLimparCache() {
		return BotaoAcao.criar('Excluir dados armazenados localmente', evt => {
			evt.preventDefault();
			excluirDatasSalvas();
			this.doc.defaultView.alert('Dados locais excluídos.');
		});
	}

	adicionarBotaoOrdenar() {
		return BotaoAcao.criar(
			'Ordenar por data de trânsito',
			this.onBotaoOrdenarClicked.bind(this)
		);
	}

	async obterDadosPaginacao(): Promise<DadosPaginacao> {
		const paginaAtual = await this.query<HTMLInputElement>(
			'#hdnInfraPaginaAtual'
		);
		if (Number(paginaAtual.value) !== 0) {
			throw new NaoCarregarOutrasPaginasError();
		}

		// Garante que há mais de uma página
		await this.query<HTMLAnchorElement>('#lnkInfraProximaPaginaSuperior').catch(
			() => Promise.reject(new NaoCarregarOutrasPaginasError())
		);

		const paginacao = this.doc.querySelector<HTMLSelectElement>(
			'#selInfraPaginacaoSuperior'
		);
		const paginas = paginacao === null ? 2 : paginacao.options.length;

		const tabela = await this.query<HTMLTableElement>(
			'#divInfraAreaTabela > table'
		);
		const caption = await this.query<HTMLTableCaptionElement>(
			'caption',
			tabela
		);
		const match = (caption.textContent || '').match(
			/Lista de  \((\d+) registros - \d+ a \d+\):/
		);
		if (!match) {
			throw new Error('Descrição do número de elementos desconhecida.');
		}

		return {
			tBody: await this.query<HTMLTableSectionElement>('tbody'),
			caption,
			registros: Number(match[1]),
			form: await queryParent<HTMLFormElement>(tabela, 'form'),
			paginacaoSuperior: await this.query<HTMLDivElement>(
				'#divInfraAreaPaginacaoSuperior'
			),
			paginacaoInferior: await this.query<HTMLDivElement>(
				'#divInfraAreaPaginacaoInferior'
			),
			paginaAtual,
			paginas,
		};
	}

	async obterDadosOficios(): Promise<DadosOficios> {
		const links = await Promise.all(
			this.queryAll<HTMLImageElement>(
				'img[src$="/infra_css/imagens/lupa.gif"]'
			).map(lupa => queryParent<HTMLAnchorElement>(lupa, 'a[href]'))
		);
		if (links.length === 0)
			throw new Error('Não foram encontrados ofícios requisitórios.');
		const baseUrl = this.doc.location.href;
		const urls = links
			.map(link => link.getAttribute('onclick') || '')
			.map(codigo => codigo.match(/window\.open\('([^']+)'/))
			.filter((x): x is RegExpMatchArray => x !== null)
			.map(match => new URL(match[1], baseUrl).href);
		if (urls.length !== links.length) {
			throw new Error('Não foi possível obter a URL de todos os ofícios.');
		}
		const linhas = await Promise.all(
			links.map(link => queryParent<HTMLTableRowElement>(link, 'tr'))
		);
		const tabela = await queryParent<HTMLTableElement>(linhas[0], 'table');
		return { linhas, tabela, urls };
	}

	onBotaoCarregarPaginasClicked(dados: DadosPaginacao, evt: Event) {
		evt.preventDefault();
		if (this._isLoadingPages) return;
		const {
			caption,
			form,
			paginas,
			paginacaoSuperior,
			paginacaoInferior,
			registros,
			tBody,
		} = dados;
		const botao = <HTMLButtonElement>evt.target;
		const originalText = botao.textContent;
		const data = new FormData(form);
		this._isLoadingPages = true;
		return limitConcurrency(
			1,
			pagina => {
				const inicial = pagina * 50 + 1;
				const final = Math.min(registros, inicial + 49);
				botao.textContent = `Carregando ofícios ${inicial} a ${final}...`;
				data.set('hdnInfraPaginaAtual', pagina.toString());
				return buscarDados('POST', this.doc.location.href, data).then(doc =>
					Array.from(
						doc.querySelectorAll<HTMLTableRowElement>(
							'#divInfraAreaTabela > table > tbody > tr:nth-child(n + 2)'
						)
					)
				);
			},
			Array.from({ length: paginas - 1 }, (_, i) => i + 1)
		)
			.then(colecoes =>
				colecoes
					.reduce((prev, curr) => prev.concat(curr))
					.reduce((frag, linha, i) => {
						frag.appendChild(linha);
						const ordinal = String(50 + i);
						linha.id = `tr_${ordinal}`;
						const chk = linha.cells[0].querySelector<HTMLInputElement>(
							'input[type=checkbox]'
						);
						if (chk) {
							chk.id = `chklinha_${ordinal}`;
							chk.setAttribute('onclick', `marcaDesmarcaLinha(${ordinal})`);
						}
						return frag;
					}, this.doc.createDocumentFragment())
			)
			.then(frag => {
				Array.from(tBody.rows).forEach(linha => {
					linha.onmouseover = null;
					linha.onmouseout = null;
					linha.classList.remove('infraTrSelecionada');
				});
				tBody.classList.add('gm-conferir-rpv__tbody');
				tBody.appendChild(frag);
				caption.textContent = `Lista de ${registros} registros:`;
				[paginacaoSuperior, paginacaoInferior, botao].forEach(el => {
					el.style.display = 'none';
				});
			})
			.then(x => console.log('Resultado:', x), e => console.error(e))
			.then(() => {
				botao.textContent = originalText;
				this._isLoadingPages = false;
			});
	}

	onBotaoOrdenarClicked(evt: Event) {
		evt.preventDefault();
		if (this._isLoadingDates) return;
		this._isLoadingDates = true;
		const botao = <HTMLButtonElement>evt.target;
		const originalText = botao.textContent;
		this.obterDadosOficios().then(dados => {
			carregarDatasSalvas();
			const { linhas, tabela, urls } = dados;
			let porcentagem = 0;
			const step = 1 / urls.length;
			return limitConcurrency(
				4,
				url => {
					const textoPorcentagem = porcentagem.toLocaleString('pt-BR', {
						style: 'percent',
					});
					botao.textContent = `Carregando dados... ${textoPorcentagem}`;
					return buscarDataTransito(url).then(data => {
						porcentagem += step;
						const textoPorcentagem = porcentagem.toLocaleString('pt-BR', {
							style: 'percent',
						});
						botao.textContent = `Carregando dados... ${textoPorcentagem}`;
						return data;
					});
				},
				urls
			)
				.then(datas => datas.map((data, i) => ({ data, linha: linhas[i] })))
				.then(infos => {
					const th = this.doc.createElement('th');
					th.classList.add('infraTh');
					th.textContent = 'Trânsito';
					tabela.rows[0].appendChild(th);
					infos.sort((a, b) => {
						const dataA = a.data;
						const dataB = b.data;
						return dataA < dataB ? -1 : dataA > dataB ? 1 : 0;
					});
					tabela.appendChild(
						infos.reduce((frag, { data, linha }, i) => {
							frag.appendChild(linha);
							const primeiraCelula = linha.cells[0];
							primeiraCelula.insertAdjacentHTML(
								'afterbegin',
								String(i + 1).padStart(3, '0')
							);
							const celulaTransito = linha.insertCell(linha.cells.length);
							celulaTransito.textContent = data.toLocaleDateString();
							return frag;
						}, this.doc.createDocumentFragment())
					);
				})
				.then(() => (botao.style.display = 'none'))
				.then(x => console.log('Resultado:', x), e => console.error(e))
				.then(() => {
					salvarDatas();
					botao.textContent = originalText;
					this._isLoadingDates = false;
				});
		});
	}
}

function limitConcurrency<T, U>(
	max: number,
	mapper: (_: T) => Promise<U>,
	originalItems: T[]
) {
	const items = originalItems.slice();
	return new Promise<U[]>((res, rej) => {
		const promises: Promise<void | U>[] = [];
		let rejected = false;
		let running = 0;
		const doLoop = () => {
			if (rejected) return;
			if (running >= max) return;
			if (items.length) {
				const item = <T>items.shift();
				promises.push(
					mapper(item).then(
						x => {
							running--;
							setImmediate(doLoop);
							return x;
						},
						e => {
							if (!rejected) {
								rejected = true;
								rej(e);
							}
						}
					)
				);
				running++;
				setImmediate(doLoop);
			} else {
				res(Promise.all(<Promise<U>[]>promises));
			}
		};
		doLoop();
	});
}

class NaoCarregarOutrasPaginasError extends Error {}

function queryParent<T extends HTMLElement>(element: Node, selector: string) {
	let parent = element.parentElement;
	while (parent !== null) {
		if (parent.matches(selector)) return Promise.resolve(<T>parent);
		parent = parent.parentElement;
	}
	return Promise.reject(new Error('Ancestral não encontrado.'));
}

function buscarDados<T extends XMLHttpRequestResponseType = 'document'>(
	method: string,
	url: string,
	data: any = null,
	responseType: T = <T>'document'
) {
	return new Promise<
		T extends 'document' ? Document : T extends 'text' ? string : any
	>((res, rej) => {
		const xhr = new XMLHttpRequest();
		xhr.open(method, url);
		xhr.responseType = responseType;
		xhr.addEventListener('load', () => {
			res(responseType === 'text' ? xhr.responseText : xhr.response);
		});
		xhr.addEventListener('error', rej);
		xhr.send(data);
	});
}

let datas: Map<number, Date> = new Map();
function carregarDatasSalvas() {
	const dados: [number, string][] = JSON.parse(
		localStorage.getItem('datas-transito') || '[]'
	);
	datas = new Map(
		dados.map<[number, Date]>(([numero, data]) => [
			numero,
			ConversorData.analisar(data),
		])
	);
}
function salvarDatas() {
	localStorage.setItem(
		'datas-transito',
		JSON.stringify(
			Array.from(datas).map<[number, string]>(([numero, data]) => [
				numero,
				ConversorData.converter(data),
			])
		)
	);
}
function excluirDatasSalvas() {
	localStorage.removeItem('datas-transito');
}

function buscarDataTransito(url: string) {
	const params = new URL(url).searchParams;
	const numero = Number(params.get('txtNumRequisicao'));
	if (!isNaN(numero) && datas.has(numero)) {
		return Promise.resolve(<Date>datas.get(numero));
	}
	return buscarDados('GET', url, null, 'text')
		.then(
			html =>
				html.match(
					/<td><span class="titBold">Data do trânsito em julgado da sentença ou acórdão\(JEF\):<\/span> (\d{2}\/\d{2}\/\d{4})<\/td>/
				) ||
				(console.log('Data do trânsito não encontrada:', html),
				Promise.reject<RegExpMatchArray>(
					new Error('Data do trânsito não encontrada')
				))
		)
		.then(match => match[1])
		.then(ConversorData.analisar)
		.then(data => {
			if (!isNaN(numero)) {
				datas.set(numero, data);
			}
			return data;
		});
}
