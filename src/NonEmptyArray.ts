export class NonEmptyArray<A> {
	constructor(public head: A, public tail: A[]) {}
	static unsafeFromArray<T>(xs: ArrayLike<T>) {
		if (xs.length === 0) throw new Error('Array não contém elementos.');
		const head = xs[0];
		const tail = Array.prototype.slice.call(xs, 1) as T[];
		return new NonEmptyArray(head, tail);
	}
}
export default NonEmptyArray;
