import Either from './Either';
import { queryAll, queryOneE } from './query';

type Translate<O> = Either<
	Error,
	{ [K in keyof O]: O[K] extends Either<Error, infer T> ? T : never }
>;

const allFactory = (doc: Document) => <T extends Element>(
	selector: string
): Either<Error, T[]> => Either.of(queryAll<T>(selector, doc));
const oneFactory = (doc: Document) => <T extends Element>(
	selector: string
): Either<Error, T> => queryOneE<T>(selector, doc);

function translate<T extends { [key: string]: Either<Error, any> }>(
	obj: T
): Translate<typeof obj> {
	return Object.keys(obj).reduce(
		(newObj, key) =>
			newObj.ap(obj[key].map(a => (as: {}) => Object.assign(as, a))),
		Either.of<Error, {}>({})
	);
}

export default function obterElementos(doc: Document):Either<Error,Elementos> {
	const all = allFactory(doc);
	const one = oneFactory(doc);
	return translate({
		areaTelaD: one<HTMLDivElement>('div#divInfraAreaTelaD');
		linksCriar: all<HTMLAnchorElement>(
			'a[href^="controlador.php?acao=criar_solicitacao_pagamento&"]'
		),
		tabela: one<HTMLTableElement>('table#tabelaNomAJG'),
	});
}
