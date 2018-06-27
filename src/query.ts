import Either from './Either';
import Maybe, { nothing, just } from './Maybe';
import NonEmptyArray from './NonEmptyArray';

export function queryOneE<T extends Element>(
	selector: string,
	context: NodeSelector
): Either<Error, T> {
	return querySomeE<T>(selector, context).chain(elts =>
		Either.partition(elts => elts.tail.length === 0, elts).bimap(
			() =>
				new Error(`Mais de um elemento corresponde ao seletor '${selector}'.`),
			elts => elts.head
		)
	);
}

export function queryOne<T extends Element>(
	selector: string,
	context: NodeSelector
): Maybe<T> {
	const elts = context.querySelectorAll<T>(selector);
	return elts.length !== 1 ? nothing() : just(elts[0]);
}

export function queryAll<T extends Element>(
	selector: string,
	context: NodeSelector
): T[] {
	return Array.from(context.querySelectorAll<T>(selector));
}

export function querySomeE<T extends Element>(
	selector: string,
	context: NodeSelector
): Either<Error, NonEmptyArray<T>> {
	return querySome<T>(selector, context).toEither_(
		() => new Error(`Nenhum elemento corresponde ao seletor '${selector}'.`)
	);
}

export function querySome<T extends Element>(
	selector: string,
	context: NodeSelector
): Maybe<NonEmptyArray<T>> {
	const elts = context.querySelectorAll<T>(selector);
	if (elts.length === 0) return nothing();
	const head = elts[0];
	const tail = Array.prototype.slice.call(elts, 1);
	return just(new NonEmptyArray(head, tail));
}
