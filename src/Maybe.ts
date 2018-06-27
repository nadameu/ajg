import Either, { left, right } from './Either';
import { Task } from './Task';

export abstract class Maybe<A> {
	abstract isJust: boolean;
	abstract isNothing: boolean;
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
		return this.chain(a => Maybe.fromNullable(f(a)));
	}
	toArray(): A[] {
		return this.maybe([], a => [a]);
	}
	toEither<B>(b: B): Either<B, A> {
		return this.maybe<Either<B, A>>(left(b), right);
	}
	toEither_<B>(f: () => B): Either<B, A> {
		return this.maybe_<Either<B, A>>(() => left(f()), right);
	}
	toTask<B>(f: (rej: (_: B) => void) => void): Task<B, A> {
		return new Task((rej, res) => this.maybe_(() => f(rej), res));
	}
	unsafeGetValue(): A {
		return this.maybe_(() => {
			throw new Error('Nothing has no value.');
		}, a => a);
	}

	static fromNullable<A>(a: A | null | undefined): Maybe<A> {
		return a == null ? nothing() : just(a);
	}
	static of<A>(a: A): Maybe<A> {
		return new Just(a);
	}
	static try<A>(f: () => A): Maybe<A> {
		try {
			return just(f());
		} catch (_) {
			return nothing();
		}
	}
}

export class Just<A> extends Maybe<A> {
	isJust = true;
	isNothing = false;

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
	isJust = false;
	isNothing = true;

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
