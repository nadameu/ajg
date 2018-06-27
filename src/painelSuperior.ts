import html from './includes/painelSuperior.html';
import { Maybe, liftA2 } from './Maybe';
import { queryOne } from './query';
import StatusFormulario from './StatusFormulario';
import Estado from './Estado';
import { Elementos, Renderizado, Store } from './typings';
import { Action } from './Actions';

function renderizarElementos(tabela: HTMLTableElement) {
	tabela.insertAdjacentHTML('beforebegin', html);
	const obterAviso = (parent: HTMLElement) =>
		queryOne<HTMLDivElement>('.gm-ajg__aviso', parent);
	const obterPontinhos = (parent: HTMLElement) =>
		queryOne<HTMLSpanElement>('.gm-ajg__aviso-carregando-pontinhos', parent);
	return Maybe.fromNullable(tabela.parentElement).chain(parent =>
		liftA2(
			(aviso, pontinhos) => ({ aviso, pontinhos }),
			obterAviso(parent),
			obterPontinhos(parent)
		)
	);
}

export default function renderizarPainelSuperior(
	elementos: Elementos
): Renderizado {
	const { areaTelaD, linksCriar, tabela } = elementos;
	return renderizarElementos(tabela)
		.map(({ aviso, pontinhos }) => {
			const win = pontinhos.ownerDocument.defaultView;
			let timer: number;
			return {
				reducer(estado: Estado, action: Action) {
					return estado;
				},
				subscriber(store: Store<Estado>) {
					const unsubscribe = store.subscribe(
						(
							{ statusFormulario: status }: Estado,
							{ statusFormulario: statusAntigo }: Estado
						) => {
							if (status !== statusAntigo) {
								if (status !== StatusFormulario.CARREGANDO) {
									win.clearInterval(timer);
								}
								aviso.classList.remove('gm-ajg__aviso--carregando');
								aviso.classList.remove('gm-ajg__aviso--carregado');
								aviso.classList.remove('gm-ajg__aviso--nao-carregado');
								switch (status) {
									case StatusFormulario.CARREGANDO: {
										aviso.classList.add('gm-ajg__aviso--carregando');
										timer = win.setInterval(() => {
											const qtdPontinhos =
												((pontinhos.textContent || '...').length % 3) + 1;
											pontinhos.textContent = '.'.repeat(qtdPontinhos);
										}, 1000 / 3);
									}
									case StatusFormulario.INVALIDO: {
										aviso.classList.add('gm-ajg__aviso--nao-carregado');
									}
									case StatusFormulario.LINK_NAO_ENCONTRADO: {
										aviso.classList.add('gm-ajg__aviso--nao-carregado');
									}
									case StatusFormulario.CARREGADO: {
										aviso.classList.add('gm-ajg__aviso--carregado');
									}
								}
							}
						}
					);
				},
			};
		})
		.getOrElse({
			reducer(estado, action) {
				return Object.assign({}, estado, {
					statusFormulario: StatusFormulario.INVALIDO,
				});
			},
			subscriber() {},
		});
}
