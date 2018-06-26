import Either, { left, right } from './Either';

export abstract class Maybe<A> {
	abstract maybe<B>(b: B, f: (_: A) => B): B;
	abstract maybe_<B>(f: () => B, g: (_: A) => B): B;
	ap<B>(that: Maybe<(_: A) => B>): Maybe<B> {
		return this.chain(a => that.map(f => f(a)));
	}
	ap_<A, B>(this: Maybe<(_: A) => B>, that: Maybe<A>): Maybe<B> {
		return this.chain(f => that.map(f));
	}
	chain<B>(f: (_: A) => Maybe<B>): Maybe<B> {
		return this.maybe(this as any, f);
	}
	filter<B extends A>(p: (a: A) => a is B): Maybe<B>;
	filter(p: (_: A) => boolean): Maybe<A>;
	filter(p: (_: A) => boolean): Maybe<A> {
		return this.chain(a => (p(a) ? just(a) : nothing()));
	}
	map<B>(f: (_: A) => B): Maybe<B> {
		return this.chain(a => just(f(a)));
	}
	mapNullable<B>(f: (_: A) => B | null | undefined): Maybe<B> {
		return this.chain(a => {
			const b = f(a);
			return b == null ? nothing() : just(b);
		});
	}
	toEither<B>(b: B): Either<B, A> {
		return this.maybe<Either<B, A>>(left(b), right);
	}
	toEither_<B>(f: () => B): Either<B, A> {
		return this.maybe_<Either<B, A>>(() => left(f()), right);
	}

	static of<A>(a: A): Maybe<A> {
		return new Just(a);
	}
}

export class Just<A> extends Maybe<A> {
	constructor(private readonly _value: A) {
		super();
	}
	maybe<B>(_: B, f: (_: A) => B): B {
		return f(this._value);
	}
	maybe_<B>(_: () => B, g: (_: A) => B): B {
		return g(this._value);
	}
}
export function just<A>(a: A): Maybe<A> {
	return new Just(a);
}

export class Nothing extends Maybe<never> {
	maybe<B>(b: B, _: any): B {
		return b;
	}
	maybe_<B>(f: () => B, _: any): B {
		return f();
	}
}
export function nothing<A>(): Maybe<A> {
	return new Nothing();
}

export default Maybe;
