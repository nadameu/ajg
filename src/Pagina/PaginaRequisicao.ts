import './PaginaRequisicao.scss';
import Acoes from '../Acoes';
import AnalisadorLinhasTabela from '../AnalisadorLinhasTabela';
import BotaoAcao from '../BotaoAcao';
import { SALARIO_MINIMO } from '../Constantes';
import {
	ConversorAno,
	ConversorBool,
	ConversorData,
	ConversorDataHora,
	ConversorInt,
	ConversorMesAno,
	ConversorMoeda,
	ConversorPorcentagem,
	ConversorValores,
} from '../Conversor';
import Pagina from './Pagina';
import Padrao from '../Padrao';
import Requisicao from '../Requisicao';
import * as Utils from '../Utils';
import { Mensagem } from '../Mensagem';

export default class PaginaRequisicao extends Pagina {
	private _requisicao?: Requisicao;
	async obterRequisicao() {
		if (!this._requisicao) {
			this._requisicao = await this.analisarDadosRequisicao();
		}
		return this._requisicao;
	}

	async adicionarAlteracoes() {
		const win = this.doc.defaultView;
		win.addEventListener('message', this.onMensagemRecebida.bind(this));
		this.enviarSolicitacaoDados(win.opener);
	}

	async adicionarAreaDocumentosProcesso() {
		const areaTabela = await this.query('#divInfraAreaTabela');
		areaTabela.insertAdjacentHTML(
			'beforeend',
			'<div class="gm-documentos"></div>'
		);
	}

	async adicionarBotaoTelaIntimacao() {
		const botaoTelaIntimacao = BotaoAcao.criar(
			'Ir para tela de intimação',
			this.onBotaoTelaIntimacaoClicado.bind(this)
		);

		const areaTabela = await this.query('#divInfraAreaTabela');
		areaTabela.insertAdjacentHTML('beforeend', '<div class="gm-botoes"></div>');
		const areaBotoes = await this.query('.gm-botoes');
		areaBotoes.appendChild(botaoTelaIntimacao);
	}

	analisarDadosProcesso(dadosProcesso: DadosProcesso) {
		console.log('Dados do processo:', dadosProcesso);
		this.validarDadosProcesso(dadosProcesso);
		this.exibirDocumentosProcesso(dadosProcesso);
	}

	async analisarDadosRequisicao() {
		const analisador = new AnalisadorLinhasTabela(
			new Padrao(/^<span class="titBold">Status:<\/span> (.*?)$/, 'status'),
			new Padrao(
				/^<span class="titBold">Originário Jef:<\/span> (.*?)$/,
				'originarioJEF'
			),
			new Padrao(
				/^<span class="titBold">Extra Orçamentária:<\/span> (.*?)$/,
				'extraorcamentaria'
			),
			new Padrao(
				/^<span class="titBold">Processo Eletrônico:<\/span> (.*?)$/,
				'processoEletronico'
			),
			new Padrao(/^<span class="titBold">Juízo:<\/span> (.*?)$/, 'juizo'),
			new Padrao(
				/^<span class="titBold">Ação de Execução:<\/span> (.*?)$/,
				'acaoDeExecucao'
			),
			new Padrao(
				/^<span class="titBold">Ação Originária:<\/span> (.*?)$/,
				'acaoOriginaria'
			),
			new Padrao(
				/^<span class="titBold">Total Requisitado \(R\$\):<\/span> (.*)$/,
				'valorTotalRequisitado'
			),
			new Padrao(
				/^<span class="titBold">Requerido:<\/span> (.*)$/,
				'requerido'
			),
			new Padrao(/^<span class="titBold">Advogado:<\/span> ?(.*)$/, 'advogado'),
			new Padrao(
				/^<span class="titBold">Assunto Judicial:<\/span> (\d+)\s+- (.*)\s*$/,
				'codigoAssunto',
				'assunto'
			),
			new Padrao(
				/^<span class="titBold">Data do ajuizamento do processo de conhecimento:<\/span> (\d{2}\/\d{2}\/\d{4})$/,
				'dataAjuizamento'
			),
			new Padrao(
				/^<span class="titBold">Data do trânsito em julgado do processo de conhecimento:<\/span> ?(\d{2}\/\d{2}\/\d{4}|)$/,
				'dataTransitoConhecimento'
			),
			new Padrao(
				/^<span class="titBold">Data do trânsito em julgado da sentença ou acórdão\(JEF\):<\/span> (\d{2}\/\d{2}\/\d{4})$/,
				'dataTransitoSentenca'
			)
		);
		analisador.definirConversores({
			originarioJEF: ConversorBool,
			extraorcamentaria: ConversorBool,
			processoEletronico: ConversorBool,
			valorTotalRequisitado: ConversorMoeda,
			dataAjuizamento: ConversorData,
			dataTransitoSentenca: ConversorData,
		});
		analisador.prefixo = 'gm-requisicao__dados';

		const requisicao = new Requisicao();

		const titulo = (await this.queryTexto('.titReq')).trim();
		const numero = await Promise.resolve<RegExpMatchArray>(
			titulo.match(/^Requisição Nº: (\d+)$/) ||
				Promise.reject(new Error('Número da requisição não encontrado.'))
		)
			.then(match => match[1])
			.then(Utils.parseDecimalInt);
		requisicao.numero = numero;

		const tabela = await this.query<HTMLTableElement>(
			'#divInfraAreaTabela > table:nth-child(2)'
		);
		tabela.classList.add('gm-requisicao__tabela');
		analisador.analisarInto(tabela, requisicao);

		let elementoAtual = tabela.nextElementSibling;
		let modo: 'Beneficiários' | 'Honorários' | null = null;
		let ordinal = 0;
		while (elementoAtual) {
			if (elementoAtual.matches('table')) {
				const tabelaAtual = elementoAtual as HTMLTableElement;
				if ((tabelaAtual.textContent || '').trim() === 'Beneficiários') {
					modo = 'Beneficiários';
					ordinal = 0;
				} else if ((tabelaAtual.textContent || '').trim() === 'Honorários') {
					modo = 'Honorários';
					ordinal = 0;
				} else if (modo === 'Beneficiários') {
					requisicao.beneficiarios.push(
						this.analisarTabelaBeneficiarios(tabelaAtual, ordinal++)
					);
				} else if (modo === 'Honorários') {
					requisicao.honorarios.push(
						this.analisarTabelaHonorarios(tabelaAtual, ordinal++)
					);
				} else {
					console.error('Tabela não analisada!', tabelaAtual);
					throw new Error('Tabela não analisada!');
				}
			}
			elementoAtual = elementoAtual.nextElementSibling;
		}

		return requisicao;
	}

	analisarTabela(tabela: HTMLTableElement, prefixo: string) {
		tabela.classList.add('gm-requisicao__tabela');
		const analisador = new AnalisadorLinhasTabela(
			new Padrao(
				/^<span class="titBoldUnder">(.+) \(([\d./-]+)\)<\/span>$/,
				'nome',
				'cpfCnpj'
			),
			new Padrao(/^<span class="titBold">Espécie:<\/span> (.*)$/, 'especie'),
			new Padrao(
				/^<span class="titBold">Tipo Honorário<\/span> (.+)$/,
				'tipoHonorario'
			),
			new Padrao(
				/^<span class="titBold">Data Base:<\/span> (\d{2}\/\d{4})&nbsp;&nbsp;&nbsp;&nbsp;<span class="titBold">Valor Requisitado \(Principal Corrigido \+ Juros\):<\/span> ([\d.,]+ \([\d.,]+ \+ [\d.,]+\))$/,
				'dataBase',
				'valor'
			),
			new Padrao(
				/^<span class="titBold">Data Base:<\/span> (\d{2}\/\d{4})&nbsp;&nbsp;&nbsp;&nbsp;<span class="titBold">Valor Requisitado \(Principal \+ Valor Selic\):<\/span> ([\d.,]+ \([\d.,]+ \+ [\d.,]+\))$/,
				'dataBase',
				'valor'
			),
			new Padrao(
				/^<span class="titBold">(VALOR (?:BLOQUEADO|LIBERADO))<\/span>$/,
				'bloqueado'
			),
			new Padrao(
				/^<span class="titBold">Juros de Mora Fix.no Tít. Executivo:<\/span> (.*)$/,
				'tipoJuros'
			),
			new Padrao(
				/^<span class="titBold">Tipo de Despesa:<\/span> (?:.*) \((\d+)\)$/,
				'codigoTipoDespesa'
			),
			new Padrao(
				/^<span class="titBold">Doença Grave:<\/span> (Sim|Não)$/,
				'doencaGrave'
			),
			new Padrao(
				/^<span class="titBold">Doença Grave:<\/span> (Sim|Não)&nbsp;&nbsp;&nbsp;&nbsp;<span class="titBold">Data Nascimento:<\/span> (\d{2}\/\d{2}\/\d{4})$/,
				'doencaGrave',
				'dataNascimento'
			),
			new Padrao(
				/^<span class="titBold">Renuncia Valor:<\/span> ?(Sim|Não|)$/,
				'renunciaValor'
			),
			new Padrao(
				/^<span class="titBold">Situação Servidor:<\/span> (.*)$/,
				'situacaoServidor'
			),
			new Padrao(
				/^<span class="titBold">Destaque dos Honorários Contratuais:<\/span> (Sim|Não)$/,
				'destaqueHonorariosContratuais'
			),
			new Padrao(
				/^<span class="titBold">Órgao de lotação do servidor:<\/span> (.*)$/,
				'orgaoLotacaoServidor'
			),
			new Padrao(
				/^<span class="titBold">IRPF- RRA a deduzir:<\/span> (Sim|Não)$/,
				'irpf'
			),
			new Padrao(
				/^<span class="titBold">Ano Exercicio Corrente:<\/span> (\d{4})&nbsp;&nbsp;&nbsp;&nbsp;<span class="titBold">Meses Exercicio Corrente:<\/span> (\d*)&nbsp;&nbsp;&nbsp;&nbsp;<span class="titBold">Valor Exercicio Corrente:<\/span> ([\d.,]+)$/,
				'anoCorrente',
				'mesesCorrente',
				'valorCorrente'
			),
			new Padrao(
				/^<span class="titBold">Ano Exercicio Corrente:<\/span> &nbsp;&nbsp;&nbsp;&nbsp;<span class="titBold">Meses Exercicio Corrente:<\/span> (\d*)&nbsp;&nbsp;&nbsp;&nbsp;<span class="titBold">Valor Exercicio Corrente:<\/span> ([\d.,]+)$/,
				'mesesCorrente',
				'valorCorrente'
			),
			new Padrao(
				/^<span class="titBold">Meses Exercicio Anterior:<\/span> (\d*)&nbsp;&nbsp;&nbsp;&nbsp;<span class="titBold">Valor Exercicio Anterior:<\/span> ([\d.,]+)$/,
				'mesesAnterior',
				'valorAnterior'
			),
			new Padrao(
				/^<span class="titBold">Beneficiário:<\/span> (.+)$/,
				'beneficiario'
			),
			new Padrao(
				/^<span class="titBold">Requisição de Natureza Tributária \(ATUALIZADA PELA SELIC\):<\/span> (Sim|Não)$/,
				'naturezaTributaria'
			),
			new Padrao(
				/^<span class="titBold">Incide PSS:<\/span> ?(Sim|Não)$/,
				'pss'
			),
			new Padrao(
				/^<span class="titBold">Atualização Monetária:\s*<\/span>\s*(.+)$/,
				'atualizacao'
			)
		);
		analisador.definirConversores({
			dataBase: ConversorMesAno,
			valor: ConversorValores,
			bloqueado: <AnalisadorConversor<boolean>>{
				analisar(texto) {
					return texto === 'VALOR BLOQUEADO';
				},
				converter(valor) {
					return valor ? 'VALOR BLOQUEADO' : 'VALOR LIBERADO';
				},
			},
			dataNascimento: ConversorData,
			destaqueHonorariosContratuais: ConversorBool,
			doencaGrave: ConversorBool,
			renunciaValor: ConversorBool,
			irpf: ConversorBool,
			anoCorrente: ConversorAno,
			mesesCorrente: ConversorInt,
			valorCorrente: ConversorMoeda,
			mesesAnterior: ConversorInt,
			valorAnterior: ConversorMoeda,
			naturezaTributaria: ConversorBool,
			pss: ConversorBool,
		});
		analisador.prefixo = prefixo;

		return analisador.analisar(tabela);
	}

	analisarTabelaBeneficiarios(
		tabela: HTMLTableElement,
		ordinal: number
	): DadosBeneficiario {
		tabela.classList.add('gm-requisicao__beneficiarios__tabela');
		return this.analisarTabela(
			tabela,
			`gm-requisicao__beneficiario--${ordinal}`
		) as any;
	}
	analisarTabelaHonorarios(
		tabela: HTMLTableElement,
		ordinal: number
	): DadosHonorario {
		tabela.classList.add('gm-requisicao__honorarios__tabela');
		return this.analisarTabela(
			tabela,
			`gm-requisicao__honorario--${ordinal}`
		) as any;
	}

	enviarSolicitacao(janela: Window, data: Mensagem) {
		janela.postMessage(JSON.stringify(data), this.doc.location.origin);
	}

	enviarSolicitacaoAberturaDocumento(
		janela: Window,
		evento: number,
		documento: number
	) {
		const data: Mensagem = {
			acao: Acoes.ABRIR_DOCUMENTO,
			evento: evento,
			documento: documento,
		};
		return this.enviarSolicitacao(janela, data);
	}

	enviarSolicitacaoDados(janela: Window) {
		const data: Mensagem = {
			acao: Acoes.BUSCAR_DADOS,
		};
		return this.enviarSolicitacao(janela, data);
	}

	enviarSolicitacaoEditarRequisicao(janela: Window, requisicao: number) {
		const data: Mensagem = {
			acao: Acoes.EDITAR_REQUISICAO,
			requisicao,
		};
		return this.enviarSolicitacao(janela, data);
	}

	async exibirDocumentosProcesso(dadosProcesso: DadosProcesso) {
		const areaDocumentos = await this.query('.gm-documentos');
		this.exibirTitulo('Documentos do processo', areaDocumentos);
		let tabela = [
			'<table class="infraTable gm-tabela-eventos">',
			'<thead>',
			'<tr>',
			'<th class="infraTh">Evento</th>',
			'<th class="infraTh">Data</th>',
			'<th class="infraTh">Descrição</th>',
			'<th class="infraTh">Documentos</th>',
			'</tr>',
			'</thead>',
			'<tbody>',
		].join('\n');
		let css = 0;
		const eventos = ([] as DadosEvento[])
			.concat(
				dadosProcesso.calculos,
				dadosProcesso.contratos,
				dadosProcesso.despachosCitacao,
				dadosProcesso.honorarios,
				dadosProcesso.sentencas
			)
			.sort((eventoA, eventoB) => eventoB.evento - eventoA.evento)
			.reduce(
				(map, dadosEvento) => {
					if (!map.has(dadosEvento.evento)) {
						map.set(dadosEvento.evento, {
							...dadosEvento,
							documentos: new Map(),
						});
					}

					const evento = map.get(dadosEvento.evento) as Evento;

					dadosEvento.documentos.forEach(documento => {
						evento.documentos.set(documento.ordem, documento);
					});

					return map;
				},
				new Map() as Map<number, Evento>
			);
		Array.from(eventos.values()).forEach(evento => {
			tabela += [
				`<tr class="${css++ % 2 === 0 ? 'infraTrClara' : 'infraTrEscura'}">`,
				`<td>${evento.evento}</td>`,
				`<td>${ConversorDataHora.converter(new Date(evento.data))}</td>`,
				`<td>${evento.descricao}</td>`,
				'<td><table><tbody>',
			].join('\n');
			Array.from(evento.documentos.values())
				.slice()
				.sort((a, b) => a.ordem - b.ordem)
				.forEach(documento => {
					tabela += `<tr><td><a class="infraLinkDocumento" id="gm-documento-ev${
						evento.evento
					}-doc${documento.ordem}" data-evento="${
						evento.evento
					}" data-documento="${documento.ordem}" href="#">${
						documento.nome
					}</a></td></tr>`;
				});
			tabela += ['</tbody></table></td>', '</tr>'].join('\n');
		});
		tabela += ['</tbody>', '</table>'].join('\n');
		areaDocumentos.insertAdjacentHTML('beforeend', tabela);
		await Promise.all(
			Array.from(eventos.values()).map(evento => {
				Promise.all(
					Array.from(evento.documentos.values()).map(async documento => {
						const link = await this.query(
							`#gm-documento-ev${evento.evento}-doc${documento.ordem}`
						);
						link.addEventListener(
							'click',
							this.onLinkDocumentoClicado.bind(this)
						);
					})
				);
			})
		);
		this.exibirTitulo('Justiça Gratuita', areaDocumentos);
		areaDocumentos.insertAdjacentHTML(
			'beforeend',
			`<p class="gm-resposta">${dadosProcesso.justicaGratuita}</p>`
		);
	}

	exibirTitulo(texto: string, elemento: Element) {
		elemento.insertAdjacentHTML(
			'beforeend',
			`<br><br><table width="100%"><tbody><tr><td><span class="titSecao">${texto}</span></td></tr></tbody></table>`
		);
	}

	async exibirValoresCalculados() {
		const requisicao = await this.obterRequisicao();
		const areaTabela = await this.query('#divInfraAreaTabela');
		this.exibirTitulo('Conferência dos cálculos', areaTabela);

		requisicao.beneficiarios.forEach((beneficiario, ordinal) => {
			const prefixo = `.gm-requisicao__beneficiario--${ordinal}`;
			this.validarElemento(`${prefixo}__valor`, true);
			const nome = beneficiario.nome;
			let principal = beneficiario.valor.principal,
				juros = beneficiario.valor.juros,
				total = beneficiario.valor.total;
			const honorarios = requisicao.honorarios
				.map((honorario, ordinal) => Object.assign({}, honorario, { ordinal }))
				.filter(
					honorario => honorario.tipoHonorario === 'Honorários Contratuais'
				)
				.filter(
					honorario =>
						honorario.beneficiario.toUpperCase() ===
						beneficiario.nome.toUpperCase()
				);
			honorarios.forEach(honorario => {
				const prefixo = `.gm-requisicao__honorario--${honorario.ordinal}`;
				this.validarElemento(`${prefixo}__tipoHonorario`, true);
				principal += honorario.valor.principal;
				juros += honorario.valor.juros;
				total += honorario.valor.total;
			});
			let porcentagemAdvogado = 1 - beneficiario.valor.total / total;
			let porcentagemArredondada = Utils.round(porcentagemAdvogado * 100, 0);
			let calculoAdvogado = Utils.round(
				(total * porcentagemArredondada) / 100,
				2
			);
			let pagoAdvogado = Utils.round(total - beneficiario.valor.total, 2);
			let diferenca = pagoAdvogado - calculoAdvogado;
			if (Math.abs(diferenca) > 0.01) {
				porcentagemArredondada = porcentagemAdvogado * 100;
			}
			const [principalString, jurosString, totalString] = [
				principal,
				juros,
				total,
			].map(valor => ConversorMoeda.converter(valor));
			areaTabela.insertAdjacentHTML(
				'beforeend',
				`<p class="gm-resposta">${nome} &mdash; <span class="gm-resposta--indefinida">${principalString}</span> + <span class="gm-resposta--indefinida">${jurosString}</span> = <span class="gm-resposta--indefinida">${totalString}</span> em <span class="gm-resposta--indefinida">${ConversorMesAno.converter(
					beneficiario.dataBase
				)}</span></p>`
			);
			if (beneficiario.irpf) {
				this.validarElemento(`${prefixo}__irpf`, true);
				let mesesAnterior = beneficiario.mesesAnterior;
				let valorAnterior = beneficiario.valorAnterior;
				if (porcentagemAdvogado > 0) {
					valorAnterior = valorAnterior / (1 - porcentagemAdvogado);
				}
				areaTabela.insertAdjacentHTML(
					'beforeend',
					`<p class="gm-resposta gm-dados-adicionais">IRPF &mdash; Exercício Anterior &mdash; <span class="gm-resposta--indefinida">${ConversorInt.converter(
						mesesAnterior
					)} ${
						mesesAnterior > 1 ? 'meses' : 'mês'
					}</span> &mdash; <span class="gm-resposta--indefinida">${ConversorMoeda.converter(
						valorAnterior
					)}</span></p>`
				);
				// }
				// if (beneficiario.irpf.corrente) {
				let mesesCorrente = beneficiario.mesesCorrente;
				let valorCorrente = beneficiario.valorCorrente;
				if (porcentagemAdvogado > 0) {
					valorCorrente = valorCorrente / (1 - porcentagemAdvogado);
				}
				const anoCorrente =
					beneficiario.anoCorrente === undefined
						? ''
						: `(<span class="gm-resposta--indefinida">${
								beneficiario.anoCorrente
									? ConversorAno.converter(beneficiario.anoCorrente)
									: ''
						  }</span>)`;
				areaTabela.insertAdjacentHTML(
					'beforeend',
					`<p class="gm-resposta gm-dados-adicionais">IRPF &mdash; Exercício Corrente ${anoCorrente} &mdash; <span class="gm-resposta--indefinida">${ConversorInt.converter(
						mesesCorrente
					)} ${
						mesesCorrente > 1 ? 'meses' : 'mês'
					}</span> &mdash; <span class="gm-resposta--indefinida">${ConversorMoeda.converter(
						valorCorrente
					)}</span></p>`
				);
				// }
			} else if (beneficiario.irpf === false) {
				this.validarElemento(`${prefixo}__irpf`);
			}
			if (porcentagemAdvogado > 0) {
				const valoresHonorarios = honorarios.map(
					honorario => honorario.valor.total
				);
				const somaHonorarios = valoresHonorarios.reduce((a, b) => a + b, 0);
				const porcentagens = valoresHonorarios
					.map(valor => valor / somaHonorarios)
					.map(pct => (pct * porcentagemArredondada) / 100)
					.map(pct => ConversorPorcentagem.converter(pct));
				const advogados = honorarios
					.map(honorario => honorario.nome)
					.map(
						(nome, i) =>
							porcentagens.length < 2 ? nome : `${nome} (${porcentagens[i]})`
					)
					.join(', ');
				areaTabela.insertAdjacentHTML(
					'beforeend',
					`<p class="gm-resposta gm-dados-adicionais">Honorários Contratuais &mdash; ${advogados} &mdash; <span class="gm-resposta--indefinida">${ConversorPorcentagem.converter(
						porcentagemArredondada / 100
					)}</span></p>`
				);
			}
		});

		requisicao.honorarios
			.map((honorario, ordinal) => Object.assign({}, honorario, { ordinal }))
			.filter(honorario => honorario.tipoHonorario !== 'Honorários Contratuais')
			.forEach(honorario => {
				const prefixo = `.gm-requisicao__honorario--${honorario.ordinal}`;
				this.validarElemento(`${prefixo}__nome`, true);
				this.validarElemento(`${prefixo}__tipoHonorario`, true);
				this.validarElemento(`${prefixo}__valor`, true);
				areaTabela.insertAdjacentHTML(
					'beforeend',
					[
						`<p class="gm-resposta gm-resposta--indefinida">${
							honorario.nome
						}</p>`,
						`<p class="gm-resposta gm-dados-adicionais"><span class="gm-resposta--indefinida">${
							honorario.tipoHonorario
						}</span> &mdash; <span class="gm-resposta--indefinida">${ConversorMoeda.converter(
							honorario.valor.principal
						)}</span> + <span class="gm-resposta--indefinida">${ConversorMoeda.converter(
							honorario.valor.juros
						)}</span> = <span class="gm-resposta--indefinida">${ConversorMoeda.converter(
							honorario.valor.total
						)}</span> em <span class="gm-resposta--indefinida">${ConversorMesAno.converter(
							honorario.dataBase
						)}</span></p>`,
					].join('\n')
				);
			});
	}

	onBotaoTelaIntimacaoClicado(evt: MouseEvent) {
		evt.preventDefault();
		evt.stopPropagation();
		const opener = this.doc.defaultView.opener;
		this.obterRequisicao()
			.then(requisicao => {
				this.enviarSolicitacaoEditarRequisicao(opener, requisicao.numero);
			})
			.catch(error => console.error(error));
	}

	onLinkDocumentoClicado(evt: MouseEvent) {
		evt.preventDefault();
		const elemento = evt.target as HTMLAnchorElement;
		const evento = Number(elemento.dataset.evento);
		const documento = Number(elemento.dataset.documento);
		const win = this.doc.defaultView;
		this.enviarSolicitacaoAberturaDocumento(win.opener, evento, documento);
	}

	onMensagemRecebida(evt: MessageEvent) {
		console.info('Mensagem recebida', evt);
		if (evt.origin === this.doc.location.origin) {
			const data = JSON.parse(evt.data);
			if (data.acao === Acoes.RESPOSTA_DADOS) {
				(async () => {
					console.log('Dados da requisicação:', await this.obterRequisicao());
					await this.validarDadosRequisicao();
					await this.exibirValoresCalculados();
					await this.adicionarAreaDocumentosProcesso();
					await this.adicionarBotaoTelaIntimacao();
					this.analisarDadosProcesso(data.dados);
				})().catch(error => console.error(error));
			}
		}
	}

	async validarDadosProcesso(dadosProcesso: DadosProcesso) {
		const requisicao = await this.obterRequisicao();

		this.validarElemento(
			'.gm-requisicao__dados__codigoAssunto',
			dadosProcesso.assuntos.indexOf(requisicao.codigoAssunto) > -1
		);
		const dataAutuacao = ConversorData.converter(
			new Date(dadosProcesso.autuacao)
		);
		this.validarElemento(
			'.gm-requisicao__dados__dataAjuizamento',
			dataAutuacao === ConversorData.converter(requisicao.dataAjuizamento) ||
				undefined
		);

		this.validarElemento(
			'.gm-requisicao__dados__dataTransitoConhecimento',
			requisicao.dataTransitoConhecimento === '' ? true : undefined
		);

		// Conferir data de trânsito em julgado
		let dataTransito = ConversorData.converter(
			new Date(dadosProcesso.transito.dataTransito || 0)
		);
		let dataEvento = ConversorData.converter(
			new Date(dadosProcesso.transito.dataEvento || 0)
		);
		let dataDecurso = ConversorData.converter(
			new Date(dadosProcesso.transito.dataDecurso || 0)
		);
		let dataFechamento = ConversorData.converter(
			new Date(dadosProcesso.transito.dataFechamento || 0)
		);
		let dataTransitoRequisicao = ConversorData.converter(
			requisicao.dataTransitoSentenca
		);
		let isTrue =
			dataTransito === dataTransitoRequisicao ||
			dataDecurso === dataTransitoRequisicao;
		let isUndefined =
			dataEvento === dataTransitoRequisicao ||
			dataFechamento === dataTransitoRequisicao;
		this.validarElemento(
			'.gm-requisicao__dados__dataTransitoSentenca',
			isTrue ? true : isUndefined ? undefined : false
		);

		// Conferir se requerido é réu na ação
		this.validarElemento(
			'.gm-requisicao__dados__requerido',
			dadosProcesso.reus.indexOf(requisicao.requerido) > -1 &&
				(dadosProcesso.reus.length === 1 || undefined)
		);

		// Conferir se beneficiário é autor da ação
		requisicao.beneficiarios.forEach((beneficiario, ordinal) => {
			const prefixo = `gm-requisicao__beneficiario--${ordinal}`;
			const autoresMesmoCPF = dadosProcesso.autores.filter(
				autor => autor.cpfCnpj === beneficiario.cpfCnpj.replace(/[./-]/g, '')
			);
			// const autoresMesmoCPFeNome = autoresMesmoCPF.filter(autor => autor.nome.toUpperCase() === beneficiario.nome.toUpperCase());
			this.validarElemento(
				`.${prefixo}__cpfCnpj`,
				autoresMesmoCPF.length === 1
			);
			// this.validarElemento(`.${prefixo}__nome`, autoresMesmoCPFeNome.length === 1);
		});

		// Conferir se advogados representam autores da ação
		const advogados = dadosProcesso.autores.reduce((set, autor) => {
			autor.advogados.forEach(advogado => set.add(advogado.toUpperCase()));
			return set;
		}, new Set());
		requisicao.honorarios.forEach((honorario, ordinal) => {
			const prefixo = `gm-requisicao__honorario--${ordinal}`;
			if (honorario.tipoHonorario === 'Honorários Contratuais') {
				const autor = dadosProcesso.autores.find(
					autor => autor.nome.toUpperCase() === honorario.beneficiario
				);
				if (autor) {
					const advogadosAutorMesmoNome = autor.advogados.filter(
						advogado => advogado.toUpperCase() === honorario.nome.toUpperCase()
					);
					this.validarElemento(
						`.${prefixo}__nome`,
						advogadosAutorMesmoNome.length === 1
					);
				} else {
					this.validarElemento(`.${prefixo}__nome`, false);
				}
			} else if (honorario.tipoHonorario === 'Honorários de Sucumbência') {
				this.validarElemento(
					`.${prefixo}__nome`,
					advogados.has(honorario.nome.toUpperCase())
				);
			}
		});
	}

	async validarDadosRequisicao() {
		const requisicao = await this.obterRequisicao();

		// Status da requisição deve ser "Finalizada"
		this.validarElemento(
			'.gm-requisicao__dados__status',
			requisicao.status === 'Finalizada'
		);

		this.validarElemento('.gm-requisicao__dados__originarioJEF', true);
		this.validarElemento('.gm-requisicao__dados__extraorcamentaria', true);
		this.validarElemento('.gm-requisicao__dados__processoEletronico', true);
		this.validarElemento('.gm-requisicao__dados__juizo', true);
		this.validarElemento('.gm-requisicao__dados__acaoDeExecucao', true);
		this.validarElemento('.gm-requisicao__dados__acaoOriginaria', true);
		this.validarElemento('.gm-requisicao__dados__advogado', true);

		// 11.NATUREZA ALIMENTÍCIA - Salários, vencimentos, proventos, pensões e suas complementações
		// 12.NATUREZA ALIMENTÍCIA - Benefícios previdenciários e indenizações por morte ou invalidez
		// 21.NATUREZA NÃO ALIMENTÍCIA
		// 31.DESAPROPRIAÇÕES - Único imóvel residencial do credor
		// 39.DESAPROPRIAÇÕES - Demais
		const ehPrevidenciario = requisicao.codigoAssunto.match(/^04/) !== null;
		const ehServidor = requisicao.codigoAssunto.match(/^011[012]/) !== null;
		const ehDesapropriacao = requisicao.codigoAssunto.match(/^0106/) !== null;
		const ehTributario = requisicao.codigoAssunto.match(/^03/) !== null;
		let codigoNaturezaCorreto: boolean | undefined = undefined;

		type PagamentoHonorario = DadosHonorario & {
			maybeOrdinalBeneficiario: number[];
		};
		type PagamentoBeneficiario = DadosBeneficiario & {
			ordinaisContratuais: number[];
		};
		type Pagamento = {
			ordinal: number;
			prefixo: string;
		} & (
			| { tipo: 'honorario'; pagamento: PagamentoHonorario }
			| { tipo: 'beneficiario'; pagamento: PagamentoBeneficiario });

		const pagamentos: Pagamento[] = [
			requisicao.beneficiarios.map(
				(beneficiario, ordinal): Pagamento => ({
					tipo: 'beneficiario',
					ordinal,
					pagamento: {
						...beneficiario,
						valor: { ...beneficiario.valor },
						ordinaisContratuais: requisicao.honorarios
							.map((honorario, ordinal) => ({ honorario, ordinal }))
							.filter(
								({ honorario: { tipoHonorario } }) =>
									tipoHonorario === 'Honorários Contratuais'
							)
							.filter(
								({
									honorario: { beneficiario: nomeBeneficiarioContratuais },
								}) =>
									nomeBeneficiarioContratuais.toUpperCase() ===
									beneficiario.nome.toUpperCase()
							)
							.map(({ ordinal }) => ordinal),
					},
					prefixo: `gm-requisicao__beneficiario--${ordinal}`,
				})
			),
			requisicao.honorarios
				.map((honorario, ordinal) => ({ honorario, ordinal }))
				.filter(
					({ honorario: { tipoHonorario } }) =>
						tipoHonorario === 'Honorários Contratuais'
				)
				.map(
					({ honorario, ordinal }): Pagamento => ({
						tipo: 'honorario',
						ordinal,
						pagamento: {
							...honorario,
							valor: { ...honorario.valor },
							maybeOrdinalBeneficiario: requisicao.beneficiarios
								.map((beneficiario, ordinal) => ({ beneficiario, ordinal }))
								.filter(
									({ beneficiario: { nome } }) =>
										nome.toUpperCase() === honorario.beneficiario.toUpperCase()
								)
								.map(({ ordinal }) => ordinal),
						},
						prefixo: `gm-requisicao__honorario--${ordinal}`,
					})
				),
			requisicao.honorarios
				.map((honorario, ordinal) => ({ honorario, ordinal }))
				.filter(
					({ honorario: { tipoHonorario } }) =>
						tipoHonorario !== 'Honorários Contratuais'
				)
				.map(
					({ honorario, ordinal }): Pagamento => ({
						tipo: 'honorario',
						ordinal,
						pagamento: {
							...honorario,
							valor: { ...honorario.valor },
							maybeOrdinalBeneficiario: [],
						},
						prefixo: `gm-requisicao__honorario--${ordinal}`,
					})
				),
		].reduce((a, b) => a.concat(b), []);

		const LIMITE = 60 * SALARIO_MINIMO;

		const total = pagamentos.reduce(
			(soma, { pagamento }) => soma + pagamento.valor.total,
			0
		);
		this.validarElemento(
			'.gm-requisicao__dados__valorTotalRequisitado',
			requisicao.valorTotalRequisitado === Utils.round(total, 2)
				? requisicao.valorTotalRequisitado > LIMITE
					? undefined
					: true
				: false
		);

		pagamentos.forEach(pagamento => {
			// Destacar campos que requerem atenção
			const tiposHonorariosPresumeLiberado = [
				'Devolução à Seção Judiciária',
				'Honorários Periciais',
				'Honorários de Sucumbência',
				'Honorários Contratuais',
			];
			const bloqueioEstaCorreto =
				!pagamento.pagamento.bloqueado &&
				pagamento.tipo === 'honorario' &&
				tiposHonorariosPresumeLiberado.some(
					tipo => tipo === pagamento.pagamento.tipoHonorario
				);
			this.validarElemento(
				`.${pagamento.prefixo}__bloqueado`,
				bloqueioEstaCorreto || undefined
			);
			if ('tipoJuros' in pagamento.pagamento) {
				this.validarElemento(
					`.${pagamento.prefixo}__tipoJuros`,
					(pagamento.tipo === 'honorario' &&
						(pagamento.pagamento.tipoHonorario ===
							'Devolução à Seção Judiciária' ||
							pagamento.pagamento.tipoHonorario === 'Honorários Periciais') &&
						pagamento.pagamento.tipoJuros === 'Não incidem') ||
						(ehPrevidenciario &&
							pagamento.pagamento.tipoJuros === 'Poupança') ||
						undefined
				);
			}

			const naturezaTributaria =
				ehTributario &&
				(pagamento.tipo === 'beneficiario' ||
					pagamento.pagamento.tipoHonorario === 'Honorários Contratuais');
			if ('naturezaTributaria' in pagamento.pagamento) {
				this.validarElemento(
					`.${pagamento.prefixo}__naturezaTributaria`,
					pagamento.pagamento.naturezaTributaria === naturezaTributaria
				);
			} else {
				const atualizacaoCorreta =
					naturezaTributaria !==
					(pagamento.pagamento.atualizacao ===
						'IPCA-E mais Juros de Mora Fix.no Tít. Executivo');
				this.validarElemento(
					`.${pagamento.prefixo}__atualizacao`,
					atualizacaoCorreta
				);
			}

			if ('situacaoServidor' in pagamento.pagamento) {
				this.validarElemento(`.${pagamento.prefixo}__situacaoServidor`);
			}
			if ('orgaoLotacaoServidor' in pagamento.pagamento) {
				this.validarElemento(`.${pagamento.prefixo}__orgaoLotacaoServidor`);
			}
			if ('pss' in pagamento.pagamento) {
				this.validarElemento(`.${pagamento.prefixo}__pss`);
			}

			switch (pagamento.pagamento.codigoTipoDespesa) {
				case '11':
					codigoNaturezaCorreto =
						ehServidor ||
						(pagamento.tipo === 'honorario' &&
							pagamento.pagamento.tipoHonorario ===
								'Honorários de Sucumbência') ||
						undefined;
					break;

				case '12':
					codigoNaturezaCorreto = ehPrevidenciario;
					break;

				case '31':
				case '39':
					codigoNaturezaCorreto = ehDesapropriacao;
					break;

				case '21':
					codigoNaturezaCorreto =
						ehTributario ||
						(pagamento.tipo === 'honorario' &&
							pagamento.pagamento.tipoHonorario ===
								'Devolução à Seção Judiciária') ||
						undefined;
					break;
			}
			this.validarElemento(
				`.${pagamento.prefixo}__codigoTipoDespesa`,
				codigoNaturezaCorreto
			);

			if (!/^RPV/.test(pagamento.pagamento.especie)) {
				this.validarElemento(`.${pagamento.prefixo}__doencaGrave`, undefined);
			}
			if (pagamento.tipo === 'beneficiario') {
				// Conferir se valor do IRPF corresponde à quantia que o beneficiário irá receber
				if (pagamento.pagamento.irpf) {
					let irpf = 0;
					if (pagamento.pagamento.valorAnterior) {
						irpf += pagamento.pagamento.valorAnterior;
					}
					if (pagamento.pagamento.valorCorrente) {
						irpf += pagamento.pagamento.valorCorrente;
					}
					const valorIRPFConfere =
						Utils.round(irpf, 2) === pagamento.pagamento.valor.total;
					this.validarElemento(
						`.${pagamento.prefixo}__valorCorrente`,
						valorIRPFConfere
					);
					this.validarElemento(
						`.${pagamento.prefixo}__valorAnterior`,
						valorIRPFConfere
					);
				}

				const valorIncluindoContratuais = [pagamento.pagamento.valor.total]
					.concat(
						...pagamento.pagamento.ordinaisContratuais
							.map(ordinal => requisicao.honorarios[ordinal])
							.map(honorario => honorario.valor.total)
					)
					.reduce((soma, valor) => soma + valor, 0);
				const diferenca =
					Math.round(valorIncluindoContratuais * 100) - LIMITE * 100;

				if (pagamento.pagamento.especie.match(/^RPV/) !== null) {
					this.validarElemento(
						`.${pagamento.prefixo}__renunciaValor`,
						pagamento.pagamento.renunciaValor === (diferenca === 0)
					);
					this.validarElemento(
						`.${pagamento.prefixo}__especie`,
						diferenca <= 0
					);
					console.log(diferenca);
				} else {
					this.validarElemento(
						`.${pagamento.prefixo}__especie`,
						diferenca > 0 || undefined
					);
				}

				this.validarElemento(
					`.${pagamento.prefixo}__destaqueHonorariosContratuais`,
					pagamento.pagamento.destaqueHonorariosContratuais ===
						pagamento.pagamento.ordinaisContratuais.length > 0
				);
			} else if (pagamento.tipo === 'honorario') {
				if (pagamento.pagamento.tipoHonorario === 'Honorários Contratuais') {
					// Conferir se os dados do contratante estão corretos
					this.validarElemento(
						`.${pagamento.prefixo}__beneficiario`,
						pagamento.pagamento.maybeOrdinalBeneficiario.length === 1
					);
					pagamento.pagamento.maybeOrdinalBeneficiario
						.map(ord => requisicao.beneficiarios[ord])
						.forEach(beneficiario => {
							// Conferir se data-base dos honorários contratuais é a mesma do valor principal
							this.validarElemento(
								`.${pagamento.prefixo}__dataBase`,
								beneficiario.dataBase.getTime() ===
									pagamento.pagamento.dataBase.getTime()
							);
							// Conferir se razão entre principal e juros dos honorários contratuais é a mesma do valor do beneficiário
							const {
								principal: princBen,
								total: totalBen,
							} = beneficiario.valor;
							const {
								principal: princAdv,
								total: totalAdv,
							} = pagamento.pagamento.valor;
							const razao = (princBen * totalAdv) / (totalBen * princAdv);
							this.validarElemento(
								`.${pagamento.prefixo}__valor`,
								Math.abs(razao - 1) < 0.005
							);
						});

					const valorIncluindoBeneficiario = [pagamento.pagamento.valor.total]
						.concat(
							...pagamento.pagamento.maybeOrdinalBeneficiario
								.map(ord => requisicao.beneficiarios[ord])
								.map(beneficiario => beneficiario.valor.total)
						)
						.reduce((soma, valor) => soma + valor, 0);
					const diferenca =
						Math.round(valorIncluindoBeneficiario * 100) - LIMITE * 100;

					if (pagamento.pagamento.especie.match(/^RPV/) !== null) {
						this.validarElemento(
							`.${pagamento.prefixo}__renunciaValor`,
							pagamento.pagamento.renunciaValor === (diferenca === 0)
						);
						this.validarElemento(
							`.${pagamento.prefixo}__especie`,
							diferenca <= 0
						);
					} else {
						this.validarElemento(
							`.${pagamento.prefixo}__especie`,
							diferenca > 0 || undefined
						);
					}
				} else {
					const ultrapassaLimite =
						pagamento.pagamento.valor.total / LIMITE > 0.99;
					if (pagamento.pagamento.especie.match(/^RPV/) !== null) {
						this.validarElemento(
							`.${pagamento.prefixo}__renunciaValor`,
							pagamento.pagamento.renunciaValor === ultrapassaLimite
						);
						this.validarElemento(
							`.${pagamento.prefixo}__especie`,
							!ultrapassaLimite
						);
					} else {
						this.validarElemento(
							`.${pagamento.prefixo}__especie`,
							ultrapassaLimite || undefined
						);
					}
				}
			}
		});
	}
}
