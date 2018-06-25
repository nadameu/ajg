import './intl';
import { query } from './fp';
import { ConversorDataHora } from './Conversor';

test('obterAssuntos', () => {
	const expected = ['aaa', 'bbb', 'ccc'];
	document.body.innerHTML = [
		'<table summary="Assuntos"><tr><th colspan="3"></th></tr>',
		...expected.map(texto => `<tr><td>${texto}</td></tr>`),
		'</table>',
	].join('');
	const prog = query<HTMLTableElement>('table[summary="Assuntos"]')
		.flatProp('rows')
		.skip(1)
		.propIndex('cells', 0)
		.safeProp('textContent')
		.toArray();
	const actual = prog(document);
	expect(actual).toEqual(expected);
});

test('obterAutores', () => {
	const makeAutor = (nome: string, cpfCnpj: string, advogados: string[]) => ({
		nome,
		cpfCnpj,
		advogados,
	});
	const expected = [
		makeAutor('Fulano de Tal', '12345678900', []),
		makeAutor('Beltrano de Tal', '11122233344', ['Sicrano de Tal']),
		makeAutor('Trajano de Tal', '55566677788', [
			'Qualquer de Tal',
			'Outro de Tal',
		]),
	];
	document.body.innerHTML = [
		`<table>`,
		...expected
			.map(({ nome, cpfCnpj, advogados }, i) => [
				`<tr>`,
				`<td>`,
				`<div data-parte="AUTOR">${nome}</div>`,
				`<span id="spnCpfParteAutor${i}">.-${cpfCnpj}-.</span>`,
				...advogados.map(
					advogado =>
						`<a href="#">${advogado}</a> algum texto <a onmouseover="blablabla ADVOGADO blablabla">OAB/SC XXXXXXX</a>`
				),
				...['decoy1', 'decoy2'].map(
					fake =>
						`<a href="#">${fake}</a> algum texto <a onmouseover="blablabla FAKEADV blablabla">OAB/SC XXXXXXX</a>`
				),
				`</td>`,
				`</tr>`,
			])
			.reduce((xs, x) => xs.concat(x), []),
		`</table>`,
	].join('');
	const actual = Collection.of(document)
		.queryAll('[data-parte="AUTOR"]')
		.chain(autor =>
			Collection.of(autor)
				.safeProp('textContent')
				.chain(nome =>
					Collection.of(autor)
						.mapNullable(elt => {
							let parent = elt.parentElement;
							while (parent !== null) {
								if (parent.matches('td')) return parent as HTMLTableCellElement;
								parent = parent.parentElement;
							}
							return null;
						})
						.chain(celula =>
							Collection.of(celula)
								.query<HTMLSpanElement>('span[id^="spnCpfParteAutor"]')
								.safeProp('textContent')
								.method('replace', /\D/g, '')
								.map(cpfCnpj =>
									Object.assign(
										{ nome, cpfCnpj },
										{
											advogados: Collection.of(celula)
												.queryAll<HTMLAnchorElement>('a[onmouseover]')
												.filter(link =>
													Collection.of(link)
														.method('getAttribute', 'onmouseover')
														.filter(t => /ADVOGADO/.test(t))
														.exists()
												)
												.safeProp('previousElementSibling')
												.safeProp('textContent')
												.toArray(),
										}
									)
								)
						)
				)
		)
		.toArray();
	expect(actual).toEqual(expected);
});

test('obterAutuacao', () => {
	const UM_ANO = 365 * 24 * 36e5;
	const expected = new Date(Math.floor(Date.now() / 1000) * 1000 - UM_ANO);

	document.body.innerHTML = [
		`<div id="txtAutuacao">${ConversorDataHora.converter(expected)}</div>`,
	].join('');

	const actual = Collection.of(document)
		.query('#txtAutuacao')
		.safeProp('textContent')
		.map(ConversorDataHora.analisar)
		.toArray();

	expect(actual).toEqual([expected]);
});
