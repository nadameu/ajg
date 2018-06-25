import PaginaListar from './PaginaListar';
import PaginaProcesso from './PaginaProcesso';
import PaginaRequisicao from './PaginaRequisicao';
import PaginaOficioRequisitorioListar from './PaginaOficioRequisitorioListar';

type PaginaComAlteracoes =
	| PaginaListar
	| PaginaOficioRequisitorioListar
	| PaginaProcesso
	| PaginaRequisicao;

type PaginaConstrutor =
	| typeof PaginaListar
	| typeof PaginaOficioRequisitorioListar
	| typeof PaginaProcesso
	| typeof PaginaRequisicao;

const classesPorAcao: { [acao: string]: PaginaConstrutor } = {
	processo_selecionar: PaginaProcesso,
	processo_precatorio_rpv: PaginaListar,
	oficio_requisitorio_visualizar: PaginaRequisicao,
	oficio_requisitorio_listar: PaginaOficioRequisitorioListar,
};

const paginas: WeakMap<Document, PaginaComAlteracoes> = new WeakMap();

export function analisar(doc: Document) {
	if (paginas.has(doc)) {
		return Promise.resolve(<PaginaComAlteracoes>paginas.get(doc));
	}

	let classe: PaginaConstrutor | null = null;

	const url = new URL(doc.location.href);
	const acao = url.searchParams.get('acao');

	if (doc.domain.match(/^eproc\.(trf4|jf(pr|rs|sc))\.jus\.br$/)) {
		if (acao && acao in classesPorAcao) classe = classesPorAcao[acao];
	}

	if (classe !== null) {
		const pagina = new classe(doc);
		paginas.set(doc, pagina);
		return Promise.resolve(pagina);
	}
	return Promise.reject(new Error(`Página desconhecida: ${doc.location.href}`));
}
