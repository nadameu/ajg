export default function pipe<A, B>(ab: Fn<A, B>): Fn<A, B>;
export default function pipe<A, B, C>(ab: Fn<A, B>, bc: Fn<B, C>): Fn<A, C>;
export default function pipe<A, B, C, D>(
	ab: Fn<A, B>,
	bc: Fn<B, C>,
	cd: Fn<C, D>
): Fn<A, D>;
export default function pipe<A, B, C, D, E>(
	ab: Fn<A, B>,
	bc: Fn<B, C>,
	cd: Fn<C, D>,
	de: Fn<D, E>
): Fn<A, E>;
export default function pipe<A, B, C, D, E, F>(
	ab: Fn<A, B>,
	bc: Fn<B, C>,
	cd: Fn<C, D>,
	de: Fn<D, E>,
	ef: Fn<E, F>
): Fn<A, F>;
export default function pipe<A, B, C, D, E, F, G>(
	ab: Fn<A, B>,
	bc: Fn<B, C>,
	cd: Fn<C, D>,
	de: Fn<D, E>,
	ef: Fn<E, F>,
	fg: Fn<F, G>
): Fn<A, G>;
export default function pipe<A, B, C, D, E, F, G, H>(
	ab: Fn<A, B>,
	bc: Fn<B, C>,
	cd: Fn<C, D>,
	de: Fn<D, E>,
	ef: Fn<E, F>,
	fg: Fn<F, G>,
	gh: Fn<G, H>
): Fn<A, H>;
export default function pipe<A, B, C, D, E, F, G, H, I>(
	ab: Fn<A, B>,
	bc: Fn<B, C>,
	cd: Fn<C, D>,
	de: Fn<D, E>,
	ef: Fn<E, F>,
	fg: Fn<F, G>,
	gh: Fn<G, H>,
	hi: Fn<H, I>
): Fn<A, I>;
export default function pipe<A, B, C, D, E, F, G, H, I, J>(
	ab: Fn<A, B>,
	bc: Fn<B, C>,
	cd: Fn<C, D>,
	de: Fn<D, E>,
	ef: Fn<E, F>,
	fg: Fn<F, G>,
	gh: Fn<G, H>,
	hi: Fn<H, I>,
	ij: Fn<I, J>
): Fn<A, J>;
export default function pipe<A, B, C, D, E, F, G, H, I, J, K>(
	ab: Fn<A, B>,
	bc: Fn<B, C>,
	cd: Fn<C, D>,
	de: Fn<D, E>,
	ef: Fn<E, F>,
	fg: Fn<F, G>,
	gh: Fn<G, H>,
	hi: Fn<H, I>,
	ij: Fn<I, J>,
	jk: Fn<J, K>
): Fn<A, K>;
export default function pipe(...fs: Function[]) {
	return (y: any) => fs.reduce((result, f) => f(result), y);
}
