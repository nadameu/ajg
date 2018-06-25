export default function compose<A, B>(ab: Fn<A, B>): Fn<A, B>;
export default function compose<A, B, C>(bc: Fn<B, C>, ab: Fn<A, B>): Fn<A, C>;
export default function compose<A, B, C, D>(
	cd: Fn<C, D>,
	bc: Fn<B, C>,
	ab: Fn<A, B>
): Fn<A, D>;
export default function compose<A, B, C, D, E>(
	de: Fn<D, E>,
	cd: Fn<C, D>,
	bc: Fn<B, C>,
	ab: Fn<A, B>
): Fn<A, E>;
export default function compose<A, B, C, D, E, F>(
	ef: Fn<E, F>,
	de: Fn<D, E>,
	cd: Fn<C, D>,
	bc: Fn<B, C>,
	ab: Fn<A, B>
): Fn<A, F>;
export default function compose<A, B, C, D, E, F, G>(
	fg: Fn<F, G>,
	ef: Fn<E, F>,
	de: Fn<D, E>,
	cd: Fn<C, D>,
	bc: Fn<B, C>,
	ab: Fn<A, B>
): Fn<A, G>;
export default function compose<A, B, C, D, E, F, G, H>(
	gh: Fn<G, H>,
	fg: Fn<F, G>,
	ef: Fn<E, F>,
	de: Fn<D, E>,
	cd: Fn<C, D>,
	bc: Fn<B, C>,
	ab: Fn<A, B>
): Fn<A, H>;
export default function compose<A, B, C, D, E, F, G, H, I>(
	hi: Fn<H, I>,
	gh: Fn<G, H>,
	fg: Fn<F, G>,
	ef: Fn<E, F>,
	de: Fn<D, E>,
	cd: Fn<C, D>,
	bc: Fn<B, C>,
	ab: Fn<A, B>
): Fn<A, I>;
export default function compose<A, B, C, D, E, F, G, H, I, J>(
	ij: Fn<I, J>,
	hi: Fn<H, I>,
	gh: Fn<G, H>,
	fg: Fn<F, G>,
	ef: Fn<E, F>,
	de: Fn<D, E>,
	cd: Fn<C, D>,
	bc: Fn<B, C>,
	ab: Fn<A, B>
): Fn<A, J>;
export default function compose<A, B, C, D, E, F, G, H, I, J, K>(
	jk: Fn<J, K>,
	ij: Fn<I, J>,
	hi: Fn<H, I>,
	gh: Fn<G, H>,
	fg: Fn<F, G>,
	ef: Fn<E, F>,
	de: Fn<D, E>,
	cd: Fn<C, D>,
	bc: Fn<B, C>,
	ab: Fn<A, B>
): Fn<A, K>;
export default function compose(...fs: Function[]) {
	return (y: any) => fs.reduceRight((result, f) => f(result), y);
}
