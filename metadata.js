export default {
	name: 'Precatórios/RPVs',
	description: 'Auxilia a conferência de RPVs e precatórios.',
	namespace: 'http://nadameu.com.br/precatorios-rpv',
	include: [
		/^https:\/\/eproc\.(trf4|jf(pr|rs|sc))\.jus\.br\/eproc(2trf4|V2)\/controlador\.php\?acao=processo_selecionar\&/,
		/^https:\/\/eproc\.(trf4|jf(pr|rs|sc))\.jus\.br\/eproc(2trf4|V2)\/controlador\.php\?acao=processo_precatorio_rpv\&/,
		/^https:\/\/eproc\.(trf4|jf(pr|rs|sc))\.jus\.br\/eproc(2trf4|V2)\/controlador\.php\?acao=oficio_requisitorio_visualizar\&/,
		/^https:\/\/eproc\.(trf4|jf(pr|rs|sc))\.jus\.br\/eproc(2trf4|V2)\/controlador\.php\?acao=oficio_requisitorio_listar\&/,
	],
	website: 'https://www.nadameu.com.br/',
	downloadURL:
		'https://github.com/nadameu/greasemonkey/raw/master/precatorios-rpv.user.js',
	updateURL:
		'https://github.com/nadameu/greasemonkey/raw/master/precatorios-rpv.meta.js',
	supportURL: 'https://github.com/nadameu/conferir-rpv/issues',
	grant: 'GM_xmlhttpRequest',
};
