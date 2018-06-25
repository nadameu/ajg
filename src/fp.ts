interface Reducer<A, B> {
	(acc: B, a: A): B;
}
type Transducer<A, B> = <C>(next: Reducer<B, C>) => Reducer<A, C>;
class Arr<A> {
	constructor(public reduce: <B>(f: Reducer<A, B>, seed: B) => B) {}
	chain<B>(f: (a: A) => ArrayLike<B>): Arr<B> {
		return this.transduce(
			<C>(next: Reducer<B, C>): Reducer<A, C> => (acc, a) =>
				Arr.from(f(a)).reduce(next, acc)
		);
	}
	map<B>(f: (a: A) => B): Arr<B> {
		return this.transduce(
			<C>(next: Reducer<B, C>): Reducer<A, C> => (acc, a) => next(acc, f(a))
		);
	}
	transduce<B>(transducer: Transducer<A, B>): Arr<B> {
		return new Arr(<C>(next: Reducer<B, C>, seed: C) =>
			this.reduce(transducer(next), seed)
		);
	}
	toArray(): A[] {
		return this.reduce((as: A[], a) => as.concat(a), []);
	}

	static from<A>(as: ArrayLike<A>): Arr<A> {
		return new Arr((f, seed) => {
			const len = as.length;
			let acc = seed;
			for (let i = 0; i < len; i++) {
				acc = f(acc, as[i]);
			}
			return acc;
		});
	}
}

abstract class Either<L, R> {
	abstract fold<B>(f: (_: L) => B, g: (_: R) => B): B;
	ap<B>(that: Either<L, (_: R) => B>): Either<L, B> {
		return that.chain(f => this.map(f));
	}
	chain<B>(f: (r: R) => Either<L, B>): Either<L, B> {
		return this.fold(left, f);
	}
	map<B>(f: (a: R) => B): Either<L, B> {
		return this.fold(left, x => right(f(x)));
	}

	static of<L = never, R = any>(a: R): Either<L, R> {
		return new Either.Right(a);
	}

	static Left = class Left<L> extends Either<L, never> {
		constructor(private _value: L) {
			super();
		}
		fold<B>(f: (_: L) => B, _: (_: never) => B): B {
			return f(this._value);
		}
	};

	static Right = class Right<R> extends Either<never, R> {
		constructor(private _value: R) {
			super();
		}
		fold<B>(_: (_: never) => B, g: (_: R) => B): B {
			return g(this._value);
		}
	};
}
function left<A = any, R = never>(a: A): Either<A, R> {
	return new Either.Left(a);
}
function right<L = never, A = any>(a: A): Either<L, A> {
	return new Either.Right(a);
}

interface Result<A> {
	log: string[];
	values: ArrayLike<A>;
}
type ResultReader<E, A> = (b: E) => Either<Error, Result<A>>;
class Monad<A> {
	constructor(private _run: ResultReader<NodeSelector, A>) {}

	flatProp<K extends keyof A, B = A[K] extends ArrayLike<infer B> ? B : any>(
		name: K
	): Monad<B> {
		return (this.safeProp(name) as any).flatten();
	}
	flatten<B>(this: Monad<ArrayLike<B>>): Monad<B> {
		return new Monad(ctx =>
			this._run(ctx).chain(({ log, values }) =>
				Arr.from(values as ArrayLike<ArrayLike<B> | {}>)
					.map<Either<Error, B[]>>(bs => {
						if (!('length' in bs))
							return left(new Error(`${log.join('.')} cannot be flattened.`));
						return right(Array.from(bs));
					})
					.reduce<Either<Error, B[]>>(
						(acc, x) => x.ap(acc.map(bs => (b: B[]) => bs.concat(b))),
						right([])
					)
					.map(values => ({ log: log.concat('flatten()'), values }))
			)
		);
	}
	propIndex<K extends keyof A, B = A[K] extends ArrayLike<infer B> ? B : any>(
		name: K,
		index: number
	): Monad<B> {}
	safeIndex<B>(this: Monad<ArrayLike<B>>, index: number): Monad<B> {}
	safeProp<K extends keyof A, B = NonNullable<A[K]>>(name: K): Monad<B> {}
	skip(n: number): Monad<A> {
		return new Monad(ctx =>
			this._run(ctx).map(({ log, values }) => ({
				log: log.concat(`skip(${n})`),
				values: Array.from(values).slice(n),
			}))
		);
	}
	toArray(): (ctx: NodeSelector) => A[] {
		return (ctx: NodeSelector) =>
			this._run(ctx).fold(() => [], ({ values }) => Array.from(values));
	}

	static do<A>(gen: () => Iterator<Monad<any>>): Monad<A> {
		const iter = gen();
		const { done, value } = iter.next();
	}
}
export function query<T extends Element>(selector: string): Monad<T> {
	return new Monad(ctx => {
		const obj = ctx.querySelector<T>(selector);
		if (obj == null)
			return {
				isRight: false,
				value: new Error(`<obj>.query('${selector}') is null`),
			};
		return {
			isRight: true,
			value: { log: [`query('${selector}')`], values: [obj] },
		};
	});
}
