interface Analisadores {
	[nome: string]: Analisador<any>;
}

interface EventoI {
	data: Date;
	descricao: string;
	documentos: Documento[] | Map<number, Documento>;
	evento: number;
}

interface DadosAutor {
	nome: string;
	cpfCnpj: string;
	advogados: string[];
}

type DadosBeneficiario = DadosPagamento & {
	ordinal: number;
};

interface DadosEvento extends EventoI {
	documentos: Documento[];
}

type DadosHonorario = DadosPagamento & {
	beneficiario: string;
	tipoHonorario:
		| 'Honorários Contratuais'
		| 'Devolução à Seção Judiciária'
		| 'Honorários de Sucumbência'
		| 'Honorários Periciais';
};

interface DadosPagamento {
	anoCorrente: Date;
	atualizacao: string;
	beneficiario: string;
	bloqueado: boolean;
	codigoTipoDespesa: string;
	cpfCnpj: string;
	dataBase: Date;
	dataNascimento: Date;
	destaqueHonorariosContratuais: boolean;
	doencaGrave: boolean;
	especie: string;
	irpf: boolean;
	mesesAnterior: number;
	mesesCorrente: number;
	naturezaTributaria?: boolean;
	nome: string;
	orgaoLotacaoServidor: string;
	pss: boolean;
	renunciaValor: boolean;
	situacaoServidor: string;
	tipoHonorario: string;
	tipoJuros: string;
	valor: DadosValor;
	valorAnterior: number;
	valorCorrente: number;
}

interface DadosProcesso {
	assuntos: string[];
	autores: DadosAutor[];
	autuacao: Date;
	calculos: DadosEvento[];
	contratos: DadosEvento[];
	despachosCitacao: DadosEvento[];
	honorarios: DadosEvento[];
	justicaGratuita: string;
	magistrado: string;
	reus: string[];
	sentencas: DadosEvento[];
	transito: DadosTransito;
}

interface DadosTransito {
	dataTransito?: Date;
	dataEvento?: Date;
	dataDecurso?: Date;
	dataFechamento?: Date;
}

interface DadosValor {
	principal: number;
	juros: number;
	total: number;
}

interface Documento {
	nome: string;
	ordem: number;
	tipo: string;
}

interface Evento extends EventoI {
	documentos: Map<number, Documento>;
}
