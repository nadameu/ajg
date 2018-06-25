export default {
	name: 'Solicitações de pagamento em bloco',
	namespace: 'http://nadameu.com.br/ajg',
	include: [
		/^https:\/\/eproc\.(trf4|jf(pr|rs|sc))\.jus\.br\/eproc(2trf4|V2)\/controlador\.php\?acao=nomeacoes_ajg_listar&/,
	],
	grant: 'none',
};
