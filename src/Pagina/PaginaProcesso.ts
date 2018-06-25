import { liftA3, liftA2 } from 'fp-ts/lib/Apply';
import * as array from 'fp-ts/lib/Array';
import * as Option from 'fp-ts/lib/Option';

import './PaginaProcesso.scss';
import Acoes from '../Acoes';
import BotaoAcao from '../BotaoAcao';
import { ConversorData, ConversorDataHora } from '../Conversor';
import { Mensagem } from '../Mensagem';
import Pagina from './Pagina';
import { PaginaListar } from './index';
import * as Utils from '../Utils';
import * as XHR from '../XHR';

export default class PaginaProcesso extends Pagina {
	private janelasDependentes: Map<string, Window> = new Map();
	urlEditarRequisicoes: Map<number, string> = new Map();

	obterAssuntos() {
		const maybeTabela = this.queryOption<HTMLTableElement>(
			'table[summary="Assuntos"]'
		);
		const linhas = array
			.catOptions([maybeTabela])
			.map(tabela => Array.from(tabela.rows).filter((_, i) => i > 0))
			.reduce((a, b) => a.concat(b), []);
		const maybeAssuntos = linhas.map(optionTextoCelula(0));
		const assuntos = array.catOptions(maybeAssuntos);
		return assuntos;
	}

	obterAutor(link: HTMLAnchorElement) {
		const maybeNome = optionText(link);
		const maybeCelula = optionParent<HTMLTableCellElement>('td', link);
		const maybeCpfCnpj = maybeCelula
			.chain(celula =>
				this.queryOption<HTMLSpanElement>(
					'span[id^="spnCpfParteAutor"]',
					celula
				)
			)
			.mapNullable(c => c.textContent)
			.map(t => t.replace(/\D/g, ''));

		return liftA3(Option.option)(
			(nome: string) => (celula: HTMLTableCellElement) => (cpfCnpj: string) => {
				const oabAdvogados = this.queryAll<HTMLAnchorElement>(
					'a',
					celula
				).filter(oab =>
					Option.fromNullable(oab.getAttribute('onmouseover')).fold(
						false,
						texto => /ADVOGADO/.test(texto)
					)
				);
				const advogados = array.catOptions(
					oabAdvogados.map(oab =>
						Option.fromNullable(oab.previousElementSibling).mapNullable(
							el => el.textContent
						)
					)
				);
				const dadosAutor: DadosAutor = {
					nome,
					cpfCnpj,
					advogados,
				};
				return dadosAutor;
			}
		)(maybeNome)(maybeCelula)(maybeCpfCnpj);
	}

	obterAutores() {
		const links = this.queryAll<HTMLAnchorElement>('a[data-parte="AUTOR"]');
		const maybeDadosAutores = links.map(link => this.obterAutor(link));
		const dadosAutores = array.catOptions(maybeDadosAutores);
		return dadosAutores;
	}

	async obterAutuacao() {
		return ConversorDataHora.analisar(await this.queryTexto('#txtAutuacao'));
	}

	obterCalculos() {
		return this.destacarDocumentosPorTipo('CALC');
	}

	async obterContratos() {
		const contratos = await this.destacarDocumentosPorTipo('CONHON');
		if (contratos.length > 0) return contratos;
		const outros = await this.destacarDocumentosPorMemo(/contrato|honor/i);
		const procuracoes = await this.destacarDocumentosPorTipo('PROC');
		return (<DadosEvento[]>[]).concat(outros, procuracoes);
	}

	obterDespachosCitacao() {
		return this.destacarDocumentosPorEvento(
			/Despacho\/Decisão - Determina Citação/
		);
	}

	async obterHonorarios() {
		return (<DadosEvento[]>[]).concat(
			await this.destacarDocumentosPorTipo('SOLPGTOHON'),
			await this.destacarDocumentosPorTipo('PGTOPERITO')
		);
	}

	obterInformacoesAdicionais() {
		return this.query('#fldInformacoesAdicionais');
	}

	obterJusticaGratuita() {
		return this.queryOption('#lnkJusticaGratuita')
			.mapNullable(l => l.textContent)
			.getOrElse('???');
	}

	async obterLinkListar() {
		return this.query<HTMLAnchorElement>(
			'a[href^="controlador.php?acao=processo_precatorio_rpv&"]',
			await this.obterInformacoesAdicionais()
		);
	}

	obterMagistrado() {
		return this.queryTexto('#txtMagistrado');
	}

	async obterNumproc() {
		return (await this.obterNumprocf()).replace(/\D/g, '');
	}

	obterNumprocf() {
		return this.queryTexto('#txtNumProcesso');
	}

	obterReus() {
		return this.queryAll('[id^="spnNomeParteReu"]')
			.map(optionText)
			.map(option => option.fold([], x => [x]))
			.reduce((a, b) => a.concat(b), []);
	}

	obterSentencas() {
		return this.destacarDocumentosPorEvento(/(^(Julgamento|Sentença))|Voto/);
	}

	obterTabelaEventos() {
		return this.query<HTMLTableElement>('#tblEventos');
	}

	async obterTransito(): Promise<DadosTransito> {
		const reDecisoesTerminativas = /(^(Julgamento|Sentença))|Voto|Recurso Extraordinário Inadmitido|Pedido de Uniformização para a Turma Nacional - Inadmitido/;
		const reDecurso = /CIÊNCIA, COM RENÚNCIA AO PRAZO|Decurso de Prazo/;
		const reTransito = /Trânsito em Julgado/;
		const reTransitoComData = /Data: (\d\d\/\d\d\/\d\d\d\d)/;

		const linhasEventos = Array.from((await this.obterTabelaEventos()).tBodies)
			.map(tbody => Array.from(tbody.rows))
			.reduce((a, b) => a.concat(b), []);
		const eventosTransito = linhasEventos.filter(linha =>
			optionTextoCelula(3)(linha).exists(t => reTransito.test(t))
		);
		const eventosTransitoComData = eventosTransito.filter(linha =>
			optionTextoCelula(3)(linha).exists(t => reTransitoComData.test(t))
		);

		if (eventosTransitoComData.length > 0) {
			const eventoTransitoComData = eventosTransitoComData[0];
			eventoTransitoComData.classList.add('gmEventoDestacado');
			const maybeDataTransito = optionTextoCelula(3)(eventoTransitoComData)
				.mapNullable(t => t.match(reTransitoComData))
				.mapNullable(m => m[1])
				.map(t => ConversorData.analisar(t));
			if (maybeDataTransito.isSome()) {
				return { dataTransito: maybeDataTransito.value };
			}
		}

		let dadosTransito: DadosTransito = {};
		if (eventosTransito.length > 0) {
			const eventoTransito = eventosTransito[0];
			eventoTransito.classList.add('gmEventoDestacado');
			const maybeDataEvento = optionTextoCelula(2)(eventoTransito).map(t =>
				ConversorDataHora.analisar(t)
			);
			if (maybeDataEvento.isSome()) {
				dadosTransito = { dataEvento: maybeDataEvento.value };
			}
		}

		const eventosDecisoesTerminativas = linhasEventos.filter(linha =>
			optionTextoCelula(3)(linha).exists(t => reDecisoesTerminativas.test(t))
		);
		if (eventosDecisoesTerminativas.length > 0) {
			const eventoDecisaoTerminativa = eventosDecisoesTerminativas[0];

			const maybeNumeroEventoDecisaoTerminativa = optionTextoCelula(1)(
				eventoDecisaoTerminativa
			).map(t => Utils.parseDecimalInt(t));

			const maybeReReferenteDecisao = maybeNumeroEventoDecisaoTerminativa.map(
				numeroEventoDecisaoTerminativa =>
					new RegExp(
						`^Intimação Eletrônica - Expedida/Certificada - Julgamento|Refer\\. ao Evento: ${numeroEventoDecisaoTerminativa}(\\D|$)`
					)
			);

			const eventosIntimacao = liftA2(Option.option)(
				(numeroEventoDecisaoTerminativa: number) => (
					reReferenteDecisao: RegExp
				) =>
					linhasEventos
						.filter(linha =>
							optionTextoCelula(1)(linha)
								.map(t => Utils.parseDecimalInt(t))
								.exists(n => n <= numeroEventoDecisaoTerminativa)
						)
						.filter(linha =>
							optionTextoCelula(3)(linha).exists(
								t => !reReferenteDecisao.test(t)
							)
						)
						.filter(linha =>
							Option.fromNullable(linha.cells[3])
								.mapNullable(c =>
									c.querySelector<HTMLSpanElement>('.infraEventoPrazoParte')
								)
								.mapNullable(el => el.dataset.parte)
								.exists(parte => /^(AUTOR|REU|MPF)$/.test(parte))
						)
			)(maybeNumeroEventoDecisaoTerminativa)(maybeReReferenteDecisao).getOrElse(
				[]
			);

			if (eventosIntimacao.length > 0) {
				type InformacaoFechamentoIntimacao = {
					numero: number;
					data: Date;
					descricao: string;
				};
				const reTooltip = /^return infraTooltipMostrar\('([^']+)','Informações do Evento',1000\);$/;
				const informacoesFechamentoIntimacoes = array.mapOption(
					eventosIntimacao,
					evento =>
						Option.fromNullable(evento.cells[1])
							.mapNullable(c => c.querySelector('a[onmouseover]'))
							.mapNullable(lupa => lupa.getAttribute('onmouseover'))
							.mapNullable(c => c.match(reTooltip))
							.map(m => m[1])
							.map(tooltip => {
								const div = this.doc.createElement('div');
								div.innerHTML = tooltip;
								return array.mapOption(
									Array.from(div.querySelectorAll('font')),
									texto =>
										Option.fromNullable(texto.textContent).map(t => t.trim())
								);
							})
							.chain(textos => {
								const indice = textos.findIndex(
									textoAtual =>
										!!textoAtual && /^Fechamento do Prazo:$/.test(textoAtual)
								);
								if (indice === -1) return Option.none;

								const data = ConversorDataHora.analisar(textos[indice + 1]);
								const textoDescricao = textos[indice + 2];
								return Option.fromNullable(
									textoDescricao.match(/^(\d+) - (.+)$/)
								)
									.map(([, numero, descricao]) => ({
										numero: Utils.parseDecimalInt(numero),
										descricao,
									}))
									.map(({ numero, descricao }) => {
										const dados: InformacaoFechamentoIntimacao = {
											numero,
											data,
											descricao,
										};
										return dados;
									});
							})
				);
				if (informacoesFechamentoIntimacoes.length > 0) {
					const fechamentoMaisRecente = informacoesFechamentoIntimacoes.reduce(
						(anterior, atual) =>
							anterior.numero > atual.numero ? anterior : atual
					);
					const eventosCorrespondentes = linhasEventos.filter(linha =>
						optionTextoCelula(1)(linha)
							.map(t => Utils.parseDecimalInt(t))
							.exists(n => n === fechamentoMaisRecente.numero)
					);
					if (eventosCorrespondentes.length > 0) {
						const eventoFechamentoMaisRecente = eventosCorrespondentes[0];
						eventoFechamentoMaisRecente.classList.add('gmEventoDestacado');
						if (fechamentoMaisRecente.descricao.match(reDecurso)) {
							dadosTransito.dataDecurso = fechamentoMaisRecente.data;
						} else {
							dadosTransito.dataFechamento = fechamentoMaisRecente.data;
						}
					}
				}
			}
		}
		return dadosTransito;
	}

	async abrirDocumento(evento: number, documento: number) {
		const celula = await this.query<HTMLTableCellElement>(
			`#tdEvento${evento}Doc${documento}`
		);
		const link = await this.query<HTMLAnchorElement>(
			'.infraLinkDocumento',
			celula
		);
		link.click();
	}

	abrirJanela(url: string, nome: string, abrirEmJanela = false) {
		this.fecharJanela(nome);
		const features = abrirEmJanela
			? 'menubar,toolbar,location,personalbar,status,scrollbars'
			: '';
		const win = window.open(url, nome, features);
		if (win) this.janelasDependentes.set(nome, win);
	}

	abrirJanelaEditarRequisicao(
		url: string,
		numero: number,
		abrirEmJanela = false
	) {
		this.abrirJanela(url, `editar-requisicao${numero}`, abrirEmJanela);
	}

	async abrirJanelaListar(abrirEmJanela = false) {
		this.abrirJanela(
			(await this.obterLinkListar()).href,
			`listarRequisicoes${await this.obterNumproc()}`,
			abrirEmJanela
		);
	}

	abrirJanelaRequisicao(url: string, numero: number, abrirEmJanela = false) {
		this.abrirJanela(url, `requisicao${numero}`, abrirEmJanela);
	}

	async adicionarAlteracoes() {
		const win = this.doc.defaultView;
		win.addEventListener('pagehide', () => {
			this.fecharJanelasDependentes();
		});
		win.addEventListener('message', this.onMensagemRecebida.bind(this));
		await this.adicionarBotao();
		(await this.obterLinkListar()).addEventListener(
			'click',
			this.onLinkListarClicado.bind(this)
		);
	}

	async consultarRequisicoesFinalizadas() {
		const link = await this.obterLinkListar();
		const docListar = await XHR.buscarDocumento(link.href);
		const paginaListar = new PaginaListar(docListar);
		const listaRequisicoes = await paginaListar.obterRequisicoes();
		const requisicoesFinalizadas = listaRequisicoes.filter(
			req => req.status === 'Finalizada'
		);
		if (requisicoesFinalizadas.length === 1) {
			const requisicao = requisicoesFinalizadas[0];
			this.urlEditarRequisicoes.set(requisicao.numero, requisicao.urlEditar);
			return this.abrirJanelaRequisicao(
				requisicao.urlConsultar,
				requisicao.numero
			);
		} else {
			return this.abrirJanelaListar();
		}
	}

	adicionarBotao() {
		return this.obterInformacoesAdicionais()
			.then(informacoesAdicionais => {
				const infoParent = informacoesAdicionais.parentElement;
				if (infoParent == null) {
					throw new Error('Informações adicionais não possui ancestral.');
				}
				return (conteudo: Node) => {
					infoParent.insertBefore(conteudo, informacoesAdicionais.nextSibling);
				};
			})
			.then(inserirAposInformacoesAdicionais => {
				const textoBotao = 'Conferir ofício requisitório';
				const botao = BotaoAcao.criar(textoBotao, evt => {
					evt.preventDefault();
					evt.stopPropagation();
					(async () => {
						botao.textContent = 'Aguarde, carregando...';
						await this.consultarRequisicoesFinalizadas();
						botao.textContent = textoBotao;
					})().catch(err => {
						console.error(err);
					});
				});

				const frag = this.doc.createDocumentFragment();
				frag.appendChild(this.doc.createElement('br'));
				frag.appendChild(botao);
				frag.appendChild(this.doc.createElement('br'));

				inserirAposInformacoesAdicionais(frag);
				return Promise.all([botao, this.obterTabelaEventos()]);
			})
			.then(([botao, tabelaEventos]) => {
				try {
					const ultimoEvento = Utils.parseDecimalInt(
						//@ts-ignore
						tabelaEventos.tBodies[0].rows[0].cells[1].textContent.trim()
					);
					if (isNaN(ultimoEvento)) throw new Error('NaN.');
					return { botao, ultimoEvento };
				} catch (err) {
					throw new Error(
						`Não foi possível localizar o último evento do processo.: ${
							err.message
						}`
					);
				}
			})
			.then(({ botao, ultimoEvento }) => {
				if (ultimoEvento > 100) {
					botao.insertAdjacentHTML(
						'afterend',
						' <div style="display: inline-block;"><span class="gmTextoDestacado">Processo possui mais de 100 eventos.</span> &mdash; <a href="#" onclick="event.preventDefault(); event.stopPropagation(); this.parentElement.style.display = \'none\'; carregarTodasPaginas(); return false;">Carregar todos os eventos</a></div>'
					);
				}
			});
	}

	async destacarDocumentos(
		linksDocumentosLinha: (linha: HTMLTableRowElement) => HTMLAnchorElement[]
	) {
		return array.catOptions(
			Array.from((await this.obterTabelaEventos()).tBodies)
				.map(tbody => Array.from(tbody.rows))
				.reduce((a, b) => a.concat(b), [])
				.map(
					(linha): Option.Option<DadosEvento> => {
						const documentos = array.catOptions(
							linksDocumentosLinha(linha).map(link =>
								Option.fromNullable(link.textContent)
									.mapNullable(texto => texto.match(/^(.*?)(\d+)$/))
									.map(([nome, tipo, ordem]) => ({
										ordem: Utils.parseDecimalInt(ordem),
										nome,
										tipo,
									}))
							)
						);

						if (documentos.length > 0) {
							linha.classList.add('gmEventoDestacado');

							const optionEvento = Option.fromNullable(linha.cells[1])
								.mapNullable(c => c.textContent)
								.map(t => Utils.parseDecimalInt(t));
							const optionData = Option.fromNullable(linha.cells[2])
								.mapNullable(c => c.textContent)
								.map(t => ConversorDataHora.analisar(t));
							const optionDescricao = Option.fromNullable(linha.cells[3])
								.mapNullable(c => c.querySelector('label.infraEventoDescricao'))
								.mapNullable(c => c.textContent);

							return liftA3(Option.option)(
								(evento: number) => (data: Date) => (descricao: string) => ({
									evento,
									data,
									descricao,
									documentos,
								})
							)(optionEvento)(optionData)(optionDescricao);
						} else {
							return Option.none;
						}
					}
				)
		);
	}

	destacarDocumentosPorEvento(regularExpression: RegExp) {
		return this.destacarDocumentos(linha => {
			return [linha]
				.filter(l =>
					Option.fromNullable(
						l.querySelector<HTMLTableCellElement>('td.infraEventoDescricao')
					)
						.mapNullable(c => c.textContent)
						.exists(t => regularExpression.test(t.trim()))
				)
				.map(l => this.queryAll<HTMLAnchorElement>('.infraLinkDocumento', l))
				.reduce((a, b) => a.concat(b), []);
		});
	}

	destacarDocumentosPorMemo(regularExpression: RegExp) {
		return this.destacarDocumentos(linha =>
			array.catOptions(
				this.queryAll('.infraTextoTooltip', linha)
					.filter(memo =>
						Option.some(memo)
							.mapNullable(m => m.textContent)
							.exists(t => regularExpression.test(t))
					)
					.map(el =>
						optionParent<HTMLTableCellElement>('td', el).chain(celula =>
							this.queryOption<HTMLAnchorElement>('.infraLinkDocumento', celula)
						)
					)
			)
		);
	}

	destacarDocumentosPorTipo(...abreviacoes: string[]) {
		const regularExpression = new RegExp(
			'^(' + abreviacoes.join('|') + ')\\d+$'
		);
		return this.destacarDocumentos(linha =>
			this.queryAll<HTMLAnchorElement>('.infraLinkDocumento', linha).filter(
				link =>
					Option.fromNullable(link.textContent).exists(texto =>
						regularExpression.test(texto)
					)
			)
		);
	}

	async enviarDadosProcesso(janela: Window, origem: string) {
		type Dados = { acao: Acoes.RESPOSTA_DADOS; dados: DadosProcesso };
		const data: Dados = {
			acao: Acoes.RESPOSTA_DADOS,
			dados: {
				assuntos: this.obterAssuntos(),
				autores: this.obterAutores(),
				autuacao: await this.obterAutuacao(),
				calculos: await this.obterCalculos(),
				despachosCitacao: await this.obterDespachosCitacao(),
				contratos: await this.obterContratos(),
				honorarios: await this.obterHonorarios(),
				justicaGratuita: this.obterJusticaGratuita(),
				magistrado: await this.obterMagistrado(),
				reus: this.obterReus(),
				sentencas: await this.obterSentencas(),
				transito: await this.obterTransito(),
			},
		};
		janela.postMessage(JSON.stringify(data), origem);
	}

	enviarRespostaJanelaAberta(janela: Window, origem: string) {
		const data: Mensagem = {
			acao: Acoes.RESPOSTA_JANELA_ABERTA,
		};
		this.enviarSolicitacao(janela, origem, data);
	}

	enviarSolicitacao(janela: Window, origem: string, dados: Mensagem) {
		janela.postMessage(JSON.stringify(dados), origem);
	}

	fecharJanela(nome: string) {
		const win = this.janelasDependentes.get(nome);
		if (win) {
			this.fecharObjetoJanela(win);
		}
		this.janelasDependentes.delete(nome);
	}

	fecharJanelasDependentes() {
		Array.from(this.janelasDependentes.keys()).forEach(nome => {
			this.fecharJanela(nome);
		});
	}

	fecharJanelaProcesso() {
		this.fecharJanelasDependentes();
		const win = this.doc.defaultView.wrappedJSObject;
		const abertos = win.documentosAbertos;
		if (abertos) {
			for (let id in abertos) {
				let janela = abertos[id];
				this.fecharObjetoJanela(janela);
			}
		}
		win.close();
	}

	fecharJanelaRequisicao(numero: number) {
		this.fecharJanela(`requisicao${numero}`);
	}

	fecharObjetoJanela(win: Window) {
		try {
			if (win && !win.closed) {
				win.close();
			}
		} catch (err) {
			// A aba já estava fechada
		}
	}

	onLinkListarClicado(evt: MouseEvent) {
		evt.preventDefault();
		evt.stopPropagation();
		let abrirEmJanela = false;
		if (evt.shiftKey) {
			abrirEmJanela = true;
		}
		this.abrirJanelaListar(abrirEmJanela);
	}

	onMensagemRecebida(evt: MessageEvent) {
		console.info('Mensagem recebida', evt);
		if (evt.origin === this.doc.location.origin) {
			const data: Mensagem = JSON.parse(evt.data);
			if (data.acao === Acoes.VERIFICAR_JANELA) {
				if (evt.source) {
					this.enviarRespostaJanelaAberta(evt.source, evt.origin);
				}
			} else if (data.acao === Acoes.ABRIR_REQUISICAO) {
				console.log('Pediram-me para abrir uma requisicao', data.requisicao);
				this.abrirJanelaRequisicao(
					data.requisicao.urlConsultar,
					data.requisicao.numero
				);
			} else if (data.acao === Acoes.EDITAR_REQUISICAO) {
				const numero = data.requisicao;
				this.fecharJanelaRequisicao(numero);
				const urlEditar = this.urlEditarRequisicoes.get(numero);
				if (urlEditar) {
					this.abrirJanelaEditarRequisicao(urlEditar, numero);
				}
			} else if (data.acao === Acoes.ABRIR_DOCUMENTO) {
				this.abrirDocumento(data.evento, data.documento);
			} else if (data.acao === Acoes.BUSCAR_DADOS) {
				if (evt.source) {
					this.enviarDadosProcesso(evt.source, evt.origin);
				}
			}
		}
	}
}

function optionParent<T extends HTMLElement = HTMLElement>(
	selector: string,
	element: Node
): Option.Option<T>;
function optionParent<T extends HTMLElement = HTMLElement>(
	selector: string
): { (element: Node): Option.Option<T> };
function optionParent(selector: string, element?: Node): any {
	if (element === undefined) {
		return function(element: Node) {
			return optionParent(selector, element);
		};
	}
	let parent = element.parentElement;
	while (parent !== null && !parent.matches(selector)) {
		parent = parent.parentElement;
	}
	return parent === null ? Option.none : Option.some(parent);
}

function optionText(elemento: Node) {
	return Option.fromNullable(elemento.textContent);
}

function optionTextoCelula(indice: number) {
	return (linha: HTMLTableRowElement) =>
		Option.fromNullable(linha.cells[indice]).mapNullable(
			celula => celula.textContent
		);
}
