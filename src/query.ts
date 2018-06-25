import { Either, left, right } from './Either';
import NonEmptyArray from './NonEmptyArray';

export function queryOne<T extends Element>(
	selector: string,
	context: NodeSelector
): Either<Error, T> {
	const elementos = context.querySelectorAll<T>(selector);
	if (elementos.length === 0)
		return left(new Error(`Elemento '${selector}' não encontrado.`));
	if (elementos.length > 1)
		return left(
			new Error(`Mais de um elemento corresponde ao seletor '${selector}'.`)
		);
	return right(elementos[0]);
}

export function queryAll<T extends Element>(
	selector: string,
	context: NodeSelector
): T[] {
	return Array.from(context.querySelectorAll<T>(selector));
}

export function querySome<T extends Element>(
	selector: string,
	context: NodeSelector
): Either<Error, NonEmptyArray<T>> {
	try {
		return right(
			NonEmptyArray.unsafeFromArray(context.querySelectorAll<T>(selector))
		);
	} catch (e) {
		return left(
			new Error(`Nenhum elemento corresponde ao seletor '${selector}'.`)
		);
	}
}
