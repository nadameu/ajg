export abstract class Either<L, R> {
	abstract either<B>(f: (_: L) => B, g: (_: R) => B): B;
	ap<B>(that: Either<L, (_: R) => B>): Either<L, B> {
		return that.chain(f => this.map(f));
	}
	chain<B>(f: (_: R) => Either<L, B>): Either<L, B> {
		return this.either<Either<L, B>>(left, f);
	}
	map<B>(f: (_: R) => B): Either<L, B> {
		return this.either<Either<L, B>>(left, r => right(f(r)));
	}
	mapLeft<B>(f: (_: L) => B): Either<B, R> {
		return this.either<Either<B, R>>(l => left(f(l)), right);
	}
	toPromise(): Promise<R> {
		return this.either(l => Promise.reject(l), r => Promise.resolve(r));
	}

	static of<L, R>(r: R): Either<L, R> {
		return new Right(r);
	}
}

class Left<L> extends Either<L, never> {
	constructor(private _value: L) {
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
	constructor(private _value: R) {
		super();
	}
	either<B>(_: any, g: (_: R) => B): B {
		return g(this._value);
	}
}
export function right<L, R>(r: R): Either<L, R> {
	return new Right(r);
}

export default Either;
