export default class Requisicao {
	acaoDeExecucao: string;
	acaoOriginaria: string;
	advogado: string;
	assunto: string;
	codigoAssunto: string;
	dataAjuizamento: Date;
	dataTransitoConhecimento: string;
	dataTransitoSentenca: Date;
	especie: string;
	extraorcamentaria: boolean;
	juizo: string;
	linha: HTMLTableRowElement;
	numero: number;
	originarioJEF: boolean;
	processoEletronico: boolean;
	requerido: string;
	status: string;
	valorTotalRequisitado: number;
	beneficiarios: DadosBeneficiario[] = [];
	honorarios: DadosHonorario[] = [];

	get isPrecatorio(): boolean {
		if (this.especie === undefined) {
			throw new Error('Espécie de requisição não definida');
		}
		return this.especie.match(/^Precatório/) !== null;
	}
}
