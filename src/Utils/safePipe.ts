type Fn<T, U> = (_: T) => U;
type Nullable<T> = T | null | undefined;
type NullableFn<T, U> = Fn<T, Nullable<U>>;

export default function safePipe<A, B>(
	obj: Nullable<A>,
	fab: Fn<A, B>
): Nullable<B>;
export default function safePipe<A, B, C>(
	obj: Nullable<A>,
	fab: NullableFn<A, B>,
	fbc: Fn<B, C>
): Nullable<C>;
export default function safePipe<A, B, C, D>(
	obj: Nullable<A>,
	fab: NullableFn<A, B>,
	fbc: NullableFn<B, C>,
	fcd: Fn<C, D>
): Nullable<D>;
export default function safePipe<A, B, C, D, E>(
	obj: Nullable<A>,
	fab: NullableFn<A, B>,
	fbc: NullableFn<B, C>,
	fcd: NullableFn<C, D>,
	fde: Fn<D, E>
): Nullable<E>;
export default function safePipe<A, B, C, D, E, F>(
	obj: Nullable<A>,
	fab: NullableFn<A, B>,
	fbc: NullableFn<B, C>,
	fcd: NullableFn<C, D>,
	fde: NullableFn<D, E>,
	fef: Fn<E, F>
): Nullable<F>;
export default function safePipe<A, B, C, D, E, F, G>(
	obj: Nullable<A>,
	fab: NullableFn<A, B>,
	fbc: NullableFn<B, C>,
	fcd: NullableFn<C, D>,
	fde: NullableFn<D, E>,
	fef: NullableFn<E, F>,
	ffg: Fn<F, G>
): Nullable<G>;
export default function safePipe<A, B, C, D, E, F, G, H>(
	obj: Nullable<A>,
	fab: NullableFn<A, B>,
	fbc: NullableFn<B, C>,
	fcd: NullableFn<C, D>,
	fde: NullableFn<D, E>,
	fef: NullableFn<E, F>,
	ffg: NullableFn<F, G>,
	fgh: Fn<G, H>
): Nullable<H>;
export default function safePipe<A, B, C, D, E, F, G, H, I>(
	obj: Nullable<A>,
	fab: NullableFn<A, B>,
	fbc: NullableFn<B, C>,
	fcd: NullableFn<C, D>,
	fde: NullableFn<D, E>,
	fef: NullableFn<E, F>,
	ffg: NullableFn<F, G>,
	fgh: NullableFn<G, H>,
	fhi: Fn<H, I>
): Nullable<I>;
export default function safePipe<A, B, C, D, E, F, G, H, I, J>(
	obj: Nullable<A>,
	fab: NullableFn<A, B>,
	fbc: NullableFn<B, C>,
	fcd: NullableFn<C, D>,
	fde: NullableFn<D, E>,
	fef: NullableFn<E, F>,
	ffg: NullableFn<F, G>,
	fgh: NullableFn<G, H>,
	fhi: NullableFn<H, I>,
	fij: Fn<I, J>
): Nullable<J>;
export default function safePipe<A, B, C, D, E, F, G, H, I, J, K>(
	obj: Nullable<A>,
	fab: NullableFn<A, B>,
	fbc: NullableFn<B, C>,
	fcd: NullableFn<C, D>,
	fde: NullableFn<D, E>,
	fef: NullableFn<E, F>,
	ffg: NullableFn<F, G>,
	fgh: NullableFn<G, H>,
	fhi: NullableFn<H, I>,
	fij: NullableFn<I, J>,
	fjk: Fn<J, K>
): Nullable<K>;
export default function safePipe(obj: any, ...fns: any[]) {
	return fns.reduce((x, f) => (x == null ? null : f(x)), obj);
}
