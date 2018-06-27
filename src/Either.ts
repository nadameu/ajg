import Maybe, { nothing, just } from './Maybe';
import { Task } from './Task';

export abstract class Either<L, R> {
	abstract isLeft: boolean;
	abstract isRight: boolean;
	abstract either<B>(f: (_: L) => B, g: (_: R) => B): B;
	ap<B>(that: Either<L, (_: R) => B>): Either<L, B> {
		return this.chain(r => that.map(f => f(r)));
	}
	ap_<L, A, B>(this: Either<L, (_: A) => B>, that: Either<L, A>): Either<L, B> {
		return this.chain(f => that.map(r => f(r)));
	}
	bimap<A, B>(f: (_: L) => A, g: (_: R) => B): Either<A, B> {
		return this.either(l => left(f(l)), r => right(g(r)));
	}
	chain<B>(f: (_: R) => Either<L, B>): Either<L, B> {
		return this.either(() => <any>this, f);
	}
	concatObj<A extends Object, B extends Object>(
		this: Either<L, A>,
		that: Either<L, B>
	): Either<L, A & B> {
		return this.ap(that.map(b => (a: A) => Object.assign({}, a, b)));
	}
	map<B>(f: (_: R) => B): Either<L, B> {
		return this.bimap(l => l, f);
	}
	mapLeft<B>(f: (_: L) => B): Either<B, R> {
		return this.bimap(f, r => r);
	}
	toMaybe(): Maybe<R> {
		return this.either(() => nothing(), r => just(r));
	}
	toPromise(): Promise<R> {
		return this.either(l => Promise.reject(l), r => Promise.resolve(r));
	}
	toTask(): Task<L, R> {
		return this.either<Task<L, R>>(Task.rejected, Task.of);
	}

	static of<L, R>(r: R): Either<L, R> {
		return new Right(r);
	}
	static partition<A, R extends A>(p: (a: A) => a is R, a: A): Either<A, R>;
	static partition<A>(p: (_: A) => boolean, a: A): Either<A, A>;
	static partition<A>(p: (_: A) => boolean, a: A) {
		return p(a) ? right(a) : left(a);
	}
	static try<L, R>(f: (_: Error) => L, g: () => R): Either<L, R> {
		try {
			return right(g());
		} catch (e) {
			return left(f(e));
		}
	}
}

class Left<L> extends Either<L, never> {
	isLeft = true;
	isRight = false;
	constructor(private readonly _value: L) {
		super();
	}
	either<B>(f: (_: L) => B, _: any): B {
		return f(this._value);
	}
}
export function left<L, R>(l: L): Either<L, R> {
	return new Left(l);
}

class Right<R> extends Either<never, R> {
	isLeft = false;
	isRight = true;
	constructor(private readonly _value: R) {
		super();
	}
	either<B>(_: any, g: (_: R) => B): B {
		return g(this._value);
	}
}
export function right<L, R>(r: R): Either<L, R> {
	return new Right(r);
}

export function liftA1<L, A, B>(
	f: (_: A) => B,
	fa: Either<L, A>
): Either<L, B> {
	return fa.map(f);
}
export function liftA2<L, A, B, C>(
	f: (a: A, b: B) => C,
	fa: Either<L, A>,
	fb: Either<L, B>
): Either<L, C> {
	return fa.map((a: A) => (b: B) => f(a, b)).ap_(fb);
}
export function liftA3<L, A, B, C, D>(
	f: (a: A, b: B, c: C) => D,
	fa: Either<L, A>,
	fb: Either<L, B>,
	fc: Either<L, C>
): Either<L, D> {
	return fa
		.map((a: A) => (b: B) => (c: C) => f(a, b, c))
		.ap_(fb)
		.ap_(fc);
}
export function liftA4<L, A, B, C, D, E>(
	f: (a: A, b: B, c: C, d: D) => E,
	fa: Either<L, A>,
	fb: Either<L, B>,
	fc: Either<L, C>,
	fd: Either<L, D>
): Either<L, E> {
	return fa
		.map((a: A) => (b: B) => (c: C) => (d: D) => f(a, b, c, d))
		.ap_(fb)
		.ap_(fc)
		.ap_(fd);
}
export function liftA5<L, A, B, C, D, E, F>(
	f: (a: A, b: B, c: C, d: D, e: E) => F,
	fa: Either<L, A>,
	fb: Either<L, B>,
	fc: Either<L, C>,
	fd: Either<L, D>,
	fe: Either<L, E>
): Either<L, F> {
	return fa
		.map((a: A) => (b: B) => (c: C) => (d: D) => (e: E) => f(a, b, c, d, e))
		.ap_(fb)
		.ap_(fc)
		.ap_(fd)
		.ap_(fe);
}

export default Either;
