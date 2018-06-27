import html from './includes/formularioRodape.html';
import { Renderizado, Elementos } from './typings';
import { StatusFormulario } from './StatusFormulario';
import { Actions } from './Actions';

export default function renderizarFormularioRodape(
	elementos: Elementos
): Renderizado {
	return {
		reducer(estado = { statusFormulario: StatusFormulario.INICIAL }, action) {
			if (estado.statusFormulario === undefined) {
				estado = { ...estado, statusFormulario: StatusFormulario.INICIAL };
			}
			switch (action.type) {
				case Actions.FORMULARIO_CARREGANDO: {
					return { ...estado, statusFormulario: StatusFormulario.CARREGANDO };
				}
				case Actions.FORMULARIO_CARREGADO: {
					return { ...estado, statusFormulario: StatusFormulario.CARREGADO };
				}
			}
			return estado;
		},
		subscriber(store) {
			const unsubscribe = store.subscribe(
				({ statusFormulario: status }, { statusFormulario: statusAntigo }) => {
					if (status !== statusAntigo) {
					}
				}
			);
			const { statusFormulario } = store.getState();
			if (statusFormulario === StatusFormulario.INICIAL) {
				elementos.areaTelaD.ownerDocument.defaultView.setTimeout(
					() => store.dispatch({ type: Actions.FORMULARIO_CARREGADO }),
					3000
				);
				store.dispatch({ type: Actions.FORMULARIO_CARREGANDO });
			}
		},
	};
}
