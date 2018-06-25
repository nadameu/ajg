import './includes/estilos.scss';
import htmlFormulario from './includes/formulario.html';
import { queryOne, querySome } from './query';
import { Either, left, right } from './Either';
import buscarDocumento from './buscarDocumento';

class ErroLinkCriarNaoExiste extends Error {
	constructor() {
		super('Link para criar solicitação de pagamentos não existe!');
	}
}

interface Nomeacao {
	idUnica: string;
	numProcesso: string;
	numeroNomeacao: string;
}

class Pagina {
	doc: Document;
	constructor(doc: Document) {
		this.doc = doc;
	}
}

function obterFormularioRequisicaoPagamentoAJG(
	doc: Document
): Either<Error, HTMLFormElement> {
	return queryOne('#frmRequisicaoPagamentoAJG', doc);
}

class PaginaNomeacoes extends Pagina {
	get tabela(): Promise<HTMLTableElement> {
		return queryOne('#tabelaNomAJG', this.doc)
			.chain<HTMLTableElement>(
				tbl =>
					tbl.matches('table')
						? right(tbl as HTMLTableElement)
						: left(
								new Error(
									'Elemento "#tabelaNomAJG" não corresponde a uma tabela.'
								)
						  )
			)
			.toPromise();
	}

	async adicionarAlteracoes() {
		const aviso = await this.adicionarAvisoCarregando();
		this.adicionarFormulario()
			.then(() => {
				aviso.setCarregado(true);
			})
			.catch(err => {
				aviso.setCarregado(false);
				if (!(err instanceof ErroLinkCriarNaoExiste)) {
					throw err;
				}
			});
	}

	async adicionarAvisoCarregando() {
		const tabela = await queryOne('#tabelaNomAJG', this.doc)
			.chain<HTMLTableElement>(
				tbl =>
					tbl.matches('table')
						? right(tbl as HTMLTableElement)
						: left(new Error("Elemento '#tabelaNomAJG' não é uma tabela."))
			)
			.toPromise();
		tabela.insertAdjacentHTML(
			'beforebegin',
			'<label class="gm-ajg__aviso"></label>'
		);
		const aviso = await queryOne<HTMLLabelElement>(
			'.gm-ajg__aviso',
			tabela
		).toPromise();
		let qtdPontinhos = 2;
		function update() {
			const pontinhos = '.'.repeat(qtdPontinhos + 1);
			aviso.textContent = `Aguarde, carregando formulário${pontinhos}`;
			qtdPontinhos = (qtdPontinhos + 1) % 3;
		}
		const win = this.doc.defaultView;
		const timer = win.setInterval(update, 1000 / 3);
		update();
		return {
			setCarregado(carregado: boolean) {
				win.clearInterval(timer);
				if (carregado) {
					aviso.classList.add('gm-ajg__aviso--carregado');
					aviso.textContent =
						'Selecione as nomeações desejadas para criar solicitações de pagamento em bloco através do formulário no final da página.';
				} else {
					aviso.classList.add('gm-ajg__aviso--nao-carregado');
				}
			},
		};
	}

	async adicionarFormulario() {
		const linkCriar = (await querySome<HTMLAnchorElement>(
			'a[href^="controlador.php?acao=criar_solicitacao_pagamento&"]',
			this.doc
		)
			.mapLeft(() => new ErroLinkCriarNaoExiste())
			.toPromise()).head;
		const areaTelaD = await queryOne<HTMLDivElement>(
			'#divInfraAreaTelaD',
			this.doc
		).toPromise();
		areaTelaD.insertAdjacentHTML(
			'beforeend',
			'<div class="gm-ajg__div"></div>'
		);
		const div = await queryOne<HTMLDivElement>(
			'.gm-ajg__div',
			areaTelaD
		).toPromise();
		div.innerHTML = '<label>Aguarde, carregando formulário...</label>';
		return buscarDocumento(linkCriar.href).then(async doc => {
			div.textContent = '';
			const form = await obterFormularioRequisicaoPagamentoAJG(doc).toPromise();
			if (!this.validarFormularioExterno(form))
				return Promise.reject(new Error('Formulário não foi validado!'));
			div.textContent = 'Ok.';
			div.innerHTML = htmlFormulario;
			const formulario = await queryOne<HTMLFormElement>(
				'.gm-ajg__formulario',
				div
			).toPromise();
			formulario.method = form.method;
			formulario.action = form.action;
			const enviar = await queryOne<HTMLButtonElement>(
				'.gm-ajg__formulario__enviar',
				div
			).toPromise();
			enviar.addEventListener('click', () =>
				this.onEnviarClicado().then(x => console.log(x), e => console.error(e))
			);
			return Promise.resolve();
		});
	}

	enviarFormulario(url: string, method: string, data: FormData) {
		return buscarDocumento(url, method, data).then(doc => {
			const validacao = doc.getElementById('txaInfraValidacao');
			const excecoes = Array.from(doc.querySelectorAll('.infraExcecao'));
			const tabelaErros = doc.querySelector<HTMLTableElement>(
				'table[summary="Erro(s)"]'
			);
			if (validacao) {
				const match = (validacao.textContent || '')
					.trim()
					.match(/^Solicitação de pagamento (\d+) criada$/);
				if (match) {
					return match[1];
				}
			}
			const msgsErro = new Set([
				'Houve um erro ao tentar criar a solicitação!',
				'',
			]);
			excecoes.forEach(excecao =>
				msgsErro.add((excecao.textContent || '').trim())
			);
			if (tabelaErros) {
				const tBodyRows = Array.from(tabelaErros.rows).slice(1);
				tBodyRows
					.map(linha => ((linha.cells[1] || {}).textContent || '').trim())
					.forEach(msg => msgsErro.add(msg));
			}
			window.errorDoc = doc;
			console.error('DEBUG: window.errorDoc');
			if (excecoes.length === 0 && !tabelaErros) {
				return false;
			}
			const msgErro = Array.from(msgsErro.values()).join('\n');
			throw new Error(msgErro);
		});
	}

	nomeacaoFromLinha(linha: HTMLTableRowElement): Promise<Nomeacao> {
		return queryOne<HTMLAnchorElement>(
			'a[href^="controlador.php?acao=criar_solicitacao_pagamento&"]',
			linha
		)
			.chain<Nomeacao>(linkCriar => {
				const parametros = new URL(linkCriar.href).searchParams;
				const idUnica = parametros.get('id_unica');
				if (!idUnica)
					return left(new Error('Não foi possível obter ID única.'));
				const [numProcesso] = idUnica.split('|').slice(1);
				if (!numProcesso)
					return left(new Error('Não foi possível obter número do processo.'));
				const numeroNomeacao = (
					(linha.cells[2] || {}).textContent || ''
				).trim();
				if (numeroNomeacao === '')
					return left(new Error('Não foi possível obter número da nomeação.'));
				return right({ idUnica, numProcesso, numeroNomeacao });
			})
			.toPromise();
	}

	async onEnviarClicado() {
		const form = await queryOne<HTMLFormElement>(
			'.gm-ajg__formulario',
			this.doc
		).toPromise();
		const url = form.action;
		const method = form.method;

		const tabela = await this.tabela;
		const linhas = Array.from(tabela.rows).slice(1);
		const linhasProcessosSelecionados = linhas.filter(linha =>
			queryOne<HTMLInputElement>('input[type="checkbox"]', linha).either(
				() => false,
				checkbox => checkbox.checked
			)
		);

		if (linhasProcessosSelecionados.length === 0) return;
		const pergunta =
			linhasProcessosSelecionados.length === 1
				? 'Criar solicitação de pagamento para 1 processo?'
				: `Criar solicitações de pagamento para ${
						linhasProcessosSelecionados.length
				  } processos?`;
		if (!confirm(pergunta)) return;

		const resultado = await queryOne(
			'.gm-ajg__resultado',
			this.doc
		).toPromise();
		resultado.innerHTML = `
<label>Solicitações a criar:</label><br>
<dl class="gm-ajg__lista"></dl>
		`;
		const lista = resultado.querySelector('.gm-ajg__lista');

		let duvida = false;
		const promise = linhasProcessosSelecionados.reduce((promise, linha) => {
			const nomeacao = this.nomeacaoFromLinha(linha);
			const data = new FormData(form);
			data.set('hdnInfraTipoPagina', '1');
			data.set('id_unica', nomeacao.idUnica);
			data.set('num_processo', nomeacao.numProcesso);
			data.set('numeroNomeacao', nomeacao.numeroNomeacao);

			const termo = this.doc.createElement('dt');
			termo.className = 'gm-ajg__lista__processo';
			termo.textContent = nomeacao.numProcesso;
			const definicao = this.doc.createElement('dd');
			definicao.className = 'gm-ajg__lista__resultado';
			definicao.textContent = 'Na fila';
			lista.appendChild(termo);
			lista.appendChild(definicao);
			const DEBUG = false;
			const fns = [
				() => (definicao.textContent = 'Criando...'),
				() =>
					DEBUG
						? new Promise((resolve, reject) => {
								let timer: number;
								timer = this.doc.defaultView.setTimeout(() => {
									this.doc.defaultView.clearTimeout(timer);
									if (Math.random() < 0.1) {
										reject(new Error('Erro ao criar solicitação!'));
									} else {
										resolve(Math.round(Math.random() * 1000));
									}
								}, 1000);
						  })
						: this.enviarFormulario(url, method, data),
				(num: never) => {
					if (num) {
						definicao.classList.add('gm-ajg__lista__resultado--ok');
						definicao.textContent = `Criada solicitação ${num}.`;
					} else {
						duvida = true;
						definicao.textContent = '???';
					}
				},
			];
			return fns.reduce((p, fn) => p.then(fn), promise).catch((err: Error) => {
				definicao.classList.add('gm-ajg__lista__resultado--erro');
				definicao.textContent = 'Erro.';
				return Promise.reject(err);
			});
		}, Promise.resolve());

		lista.scrollIntoView();

		promise.then(() => {
			let mensagem;
			if (duvida) {
				mensagem =
					'Não foi possível verificar se uma ou mais solicitações foram criadas.';
			} else {
				if (linhasProcessosSelecionados.length === 1) {
					mensagem = 'Solicitação criada com sucesso!';
				} else {
					mensagem = 'Solicitações criadas com sucesso!';
				}
				mensagem +=
					'\nA página será recarregada para atualizar a lista de processos.';
			}
			this.doc.defaultView.alert(mensagem);
			if (!duvida) {
				this.doc.defaultView.location.reload();
			}
		});
		promise.catch((err: Error) => {
			console.error(err);
			this.doc.defaultView.alert(err.message);
		});
	}

	validarFormularioExterno(form: HTMLFormElement) {
		const camposEsperados = [
			'hdnInfraTipoPagina',
			'btnnovo',
			'btnVoltar',
			'txtValorSolicitacao',
			'txtDataPrestacao',
			'chkMotivo[]',
			'chkMotivo[]',
			'chkMotivo[]',
			'chkMotivo[]',
			'chkMotivo[]',
			'chkMotivo[]',
			'selTxtObservacao',
			'selTxtDecisao',
			'numPaginaAtual',
			'id_unica',
			'num_processo',
			'numeroNomeacao',
			'btnnovo',
			'btnVoltar',
		];
		const validado =
			form.length === camposEsperados.length &&
			camposEsperados.reduce((validadoAteAgora, nomeEsperado, i) => {
				const elt = form.elements[i];
				const nome: string = (<any>elt).name || elt.id;
				return validadoAteAgora && nome === nomeEsperado;
			}, true);
		if (!validado) {
			console.error('Campos do formulário não correspondem ao esperado');
		}
		return validado;
	}
}

function main() {
	const acao = new URL(document.URL).searchParams.get('acao');
	if (acao === 'nomeacoes_ajg_listar') {
		const pagina = new PaginaNomeacoes(document);
		pagina.adicionarAlteracoes();
	}
}

main();
