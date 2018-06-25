import 'babel-polyfill';
import './includes/estilos.scss';
import { analisar } from './Pagina/PaginaFactory';

async function main() {
	const pagina = await analisar(document);
	return pagina.adicionarAlteracoes();
}

main().then(x => console.log('Resultado:', x), e => console.error(e));
