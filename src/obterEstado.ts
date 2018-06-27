import StatusFormulario from './StatusFormulario';
import { Elementos } from './typings';
import Estado from './Estado';

export default function obterEstado(elementos: Elementos): Estado {
	const { areaTelaD, linksCriar, tabela } = elementos;
	return {
		statusFormulario: StatusFormulario.INICIAL,
	};
}
