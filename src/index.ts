import buscarDocumento from './buscarDocumento';
import { Either, left, liftA2, liftA3, right } from './Either';
import './includes/estilos.scss';
import htmlFormulario from './includes/formulario.html';
import Maybe from './Maybe';
import { queryOne, querySome } from './query';
import { NonEmptyArray } from './NonEmptyArray';
import { Task } from './Task';

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

function adicionarAlteracoesPaginaNomeacoes(
	tabela: HTMLTableElement,
	links: NonEmptyArray<HTMLAnchorElement>,
	areaTelaD: HTMLDivElement
) {
	const setCarregado = adicionarAvisoCarregando(tabela);
	return adicionarFormulario(links, areaTelaD).fork(
		err => {
			setCarregado(false);
			if (!(err instanceof ErroLinkCriarNaoExiste)) {
				throw err;
			}
		},
		() => {
			setCarregado(true);
		}
	);
}

function adicionarAvisoCarregando(tabela: HTMLTableElement) {
	const doc = tabela.ownerDocument;
	const win = doc.defaultView;
	const aviso = doc.createElement('label');
	aviso.className = 'gm-ajg__aviso';
	(tabela.parentElement as HTMLElement).insertBefore(aviso, tabela);

	let qtdPontinhos = 2;
	function update() {
		const pontinhos = '.'.repeat(qtdPontinhos + 1);
		aviso.textContent = `Aguarde, carregando formulário${pontinhos}`;
		qtdPontinhos = (qtdPontinhos + 1) % 3;
	}
	const timer = win.setInterval(update, 1000 / 3);
	update();
	return function setCarregado(carregado: boolean): void {
		win.clearInterval(timer);
		if (carregado) {
			aviso.classList.add('gm-ajg__aviso--carregado');
			aviso.textContent =
				'Selecione as nomeações desejadas para criar solicitações de pagamento em bloco através do formulário no final da página.';
		} else {
			aviso.classList.add('gm-ajg__aviso--nao-carregado');
		}
	};
}

function adicionarFormulario(
	links: NonEmptyArray<HTMLAnchorElement>,
	areaTelaD: HTMLDivElement
): Task<Error, void> {
	const doc = areaTelaD.ownerDocument;
	const linkCriar = links.head;
	const div = doc.createElement('div');
	div.className = 'gm-ajg__div';
	areaTelaD.appendChild(div);
	div.innerHTML = '<label>Aguarde, carregando formulário...</label>';
	return buscarDocumento(linkCriar.href).chain(doc => {
		div.textContent = '';
		const eitherForm = obterFormularioRequisicaoPagamentoAJG(doc).chain<
			HTMLFormElement
		>(
			form =>
				validarFormularioExterno(form)
					? right(form)
					: left(new Error('Formulário não foi validado!'))
		);
		div.textContent = 'Ok.';
		div.innerHTML = htmlFormulario;
		const eitherFormulario = queryOne<HTMLFormElement>(
			'.gm-ajg__formulario',
			div
		);
		const eitherEnviar = queryOne<HTMLButtonElement>(
			'.gm-ajg__formulario__enviar',
			div
		);
		return liftA3(
			(form, formulario, enviar) => {
				formulario.method = form.method;
				formulario.action = form.action;
				enviar.addEventListener('click', () =>
					onEnviarClicado().then(x => console.log(x), e => console.error(e))
				);
			},
			eitherForm,
			eitherFormulario,
			eitherEnviar
		).toTask();
	});
}

function enviarFormulario(url: string, method: string, data: FormData) {
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

function nomeacaoFromLinha(
	linha: HTMLTableRowElement
): Either<Error, Nomeacao> {
	const eitherLinkCriar = queryOne<HTMLAnchorElement>(
		'a[href^="controlador.php?acao=criar_solicitacao_pagamento&"]',
		linha
	);
	const eitherIdUnica = eitherLinkCriar
		.toMaybe()
		.map(link => new URL(link.href).searchParams)
		.mapNullable(p => p.get('id_unica'))
		.toEither_(() => new Error('Não foi possível obter ID única.'));
	const eitherNumeroProcesso = eitherIdUnica
		.toMaybe()
		.map(id => id.split('|'))
		.mapNullable(partes => partes[1])
		.toEither_(() => new Error('Não foi possível obter número do processo.'));
	const eitherNumeroNomeacao = Maybe.of<HTMLTableRowElement>(linha)
		.map(linha => linha.cells)
		.mapNullable(celulas => celulas[2])
		.mapNullable(celula => celula.textContent)
		.map(texto => texto.trim())
		.filter(texto => texto !== '')
		.toEither_(() => new Error('Não foi possível obter número da nomeação.'));
	return liftA3(
		(idUnica, numProcesso, numeroNomeacao) => ({
			idUnica,
			numProcesso,
			numeroNomeacao,
		}),
		eitherIdUnica,
		eitherNumeroProcesso,
		eitherNumeroNomeacao
	);
}

async function onEnviarClicado(tabela: HTMLTableElement) {
	const doc = tabela.ownerDocument;
	const form = await queryOne<HTMLFormElement>(
		'.gm-ajg__formulario',
		doc
	).toPromise();
	const url = form.action;
	const method = form.method;

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

	const resultado = await queryOne('.gm-ajg__resultado', this.doc).toPromise();
	resultado.innerHTML = `
<label>Solicitações a criar:</label><br>
<dl class="gm-ajg__lista"></dl>
		`;
	const lista = resultado.querySelector('.gm-ajg__lista');

	let duvida = false;
	const promise = linhasProcessosSelecionados.reduce((promise, linha) => {
		const eitherNomeacao = nomeacaoFromLinha(linha);
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

function validarFormularioExterno(form: HTMLFormElement) {
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

function namedProp<K extends string, A>(name: K) {
	return function(obj: A): { [key in K]: A } {
		return { [name]: obj } as any;
	};
}

function obterFormularioRequisicaoPagamentoAJG(doc: Document) {
	return queryOne<HTMLFormElement>('form#frmRequisicaoPagamentoAJG', doc);
}

function obterElementosPagina(doc: Document) {
	return Either.of<Error, {}>({})
		.concatObj(
			queryOne<HTMLTableElement>('table#tabelaNomAJG', doc).map(
				namedProp('tabelaNomAJG')
			)
		)
		.concatObj(
			querySome<HTMLAnchorElement>(
				'a[href^="controlador.php?acao=criar_solicitacao_pagamento&"]',
				doc
			)
				.mapLeft(() => new ErroLinkCriarNaoExiste())
				.map(namedProp('linksCriar'))
		)
		.concatObj(
			queryOne<HTMLDivElement>('div#divInfraAreaTelaD', doc).map(
				namedProp('areaTelaD')
			)
		);
}

const main = (doc: Document) =>
	obterElementosPagina(doc)
		.toTask()
		.fork(
			e => console.error(e),
			({ areaTelaD, linksCriar, tabelaNomAJG }) =>
				adicionarAlteracoesPaginaNomeacoes(tabelaNomAJG, linksCriar, areaTelaD)
		);

main(document);
