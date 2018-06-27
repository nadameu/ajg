interface Array<T> {
	chain<U>(f: (_: T) => ArrayLike<U> | Iterable<U>): U[];
	flatten<U>(this: Array<ArrayLike<U>>): U[];
	mapNullable<U>(f: (_: T) => U | null | undefined): U[];
}
Array.prototype.chain = function<A, B>(this: Array<A>, f: (_: A) => B[]): B[] {
	return this.reduce<B[]>((acc, x) => acc.concat(Array.from(f(x))), []);
};
Array.prototype.flatten = function<A>(this: Array<ArrayLike<A>>): A[] {
	return this.chain(as => as);
};
Array.prototype.mapNullable = function<A, B>(
	this: Array<A>,
	f: (_: A) => B | null | undefined
): B[] {
	const next = (acc: B[], b: B | null | undefined) =>
		b == null ? acc : acc.concat([b]);
	return this.reduce<B[]>((acc, a) => next(acc, f(a)), []);
};
