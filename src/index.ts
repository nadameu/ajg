import Either from './Either';
import renderizarFormularioRodape from './formularioRodape';
import obterElementos from './obterElementos';
import obterEstado from './obterEstado';
import renderizarPainelSuperior from './painelSuperior';
import createStore from './Store';

const main = (doc: Document): Either<Error, void> => {
	return obterElementos(doc).map(elementos => {
		const estado = obterEstado(elementos);
		const painelSuperior = renderizarPainelSuperior(elementos);
		const formularioRodape = renderizarFormularioRodape(elementos);
		const store = createStore(
			(state, action) =>
				formularioRodape.reducer(painelSuperior.reducer(state, action), action),
			estado
		);
		store.subscribe(painelSuperior.subscriber);
		store.subscribe(formularioRodape.subscriber);
	});
};

main(document);
