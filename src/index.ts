import Either from './Either';
import renderizarFormularioRodape from './formularioRodape';
import obterElementos from './obterElementos';
import obterEstado from './obterEstado';
import renderizarPainelSuperior from './painelSuperior';
import createStore from './Store';
import './includes/estilos.scss';
import { Reducer } from './typings';
import { Action } from './Actions';
import Estado from './Estado';

function combinarRedutores(
	...redutores: Reducer<Action, Estado>[]
): Reducer<Action, Estado> {
	return (estadoInicial, action) =>
		redutores.reduce(
			(estadoAtual, redutor) => redutor(estadoAtual, action),
			estadoInicial
		);
}

const main = (doc: Document): Either<Error, void> => {
	return obterElementos(doc).map(elementos => {
		const painelSuperior = renderizarPainelSuperior(elementos);
		const formularioRodape = renderizarFormularioRodape(elementos);
		const redutor = combinarRedutores(
			formularioRodape.reducer,
			painelSuperior.reducer
		);
		const store = createStore(redutor);
		painelSuperior.subscriber(store);
		formularioRodape.subscriber(store);
	});
};

try {
	main(document);
} catch (e) {
	console.error(e);
}
