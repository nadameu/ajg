type State<E, A> = Pending | Rejected<E> | Resolved<A>;
type Pending = { done: false };
type Rejected<E> = { done: true; type: 'rejected'; value: E };
type Resolved<A> = { done: true; type: 'resolved'; value: A };

export class Task<E, A> {
	private _status: State<E, A> = { done: false };
	constructor(
		private readonly _fork: (
			onRejected: (_: E) => void,
			onResolved: (_: A) => void
		) => void
	) {}
	alt(that: Task<E, A>): Task<E, A> {
		return new Task((rej, res) =>
			this.fork(e => that.fork(() => rej(e), res), res)
		);
	}
	ap<B>(that: Task<E, (_: A) => B>): Task<E, B> {
		return new Task((rej, res) => {
			type Result<A> = { done: true; value: A } | { done: false };
			let resultA: Result<A> = { done: false };
			let resultF: Result<((_: A) => B)> = { done: false };
			let rejected = false;

			function onRejected(e: E) {
				if (!rejected) {
					rejected = true;
					rej(e);
				}
			}
			this.fork(onRejected, a => {
				if (rejected) return;
				resultA = { done: true, value: a };
				if (resultF.done) {
					res(resultF.value(a));
				}
			});
			that.fork(onRejected, f => {
				if (rejected) return;
				resultF = { done: true, value: f };
				if (resultA.done) {
					res(f(resultA.value));
				}
			});
		});
	}
	chain<B>(f: (_: A) => Task<E, B>): Task<E, B> {
		return new Task<E, B>((rej, res) =>
			this.fork(rej, a => f(a).fork(rej, res))
		);
	}
	fork(onRejected: (_: E) => void, onResolved: (_: A) => void): void {
		if (this._status.done) {
			if (this._status.type === 'resolved') {
				return onResolved(this._status.value);
			}
			if (this._status.type === 'rejected') {
				return onRejected(this._status.value);
			}
		}
		return this._fork(
			e => {
				if (!this._status.done) {
					this._status = { done: true, type: 'rejected', value: e };
					onRejected(e);
				}
			},
			a => {
				if (!this._status.done) {
					this._status = { done: true, type: 'resolved', value: a };
					onResolved(a);
				}
			}
		);
	}
	map<B>(f: (_: A) => B): Task<E, B> {
		return new Task<E, B>((rej, res) => this.fork(rej, a => res(f(a))));
	}

	static all<E, A>(
		iterable: ArrayLike<Task<E, A>> | Iterable<Task<E, A>>
	): Task<E, A[]> {
		return Array.from(iterable).reduce(
			(tas, ta) => ta.ap(tas.map(as => (a: A) => as.concat([a]))),
			Task.of(<A[]>[])
		);
	}
	static of<E, A>(a: A): Task<E, A> {
		return new Task((_, res) => res(a));
	}
	static rejected<E, A>(e: E): Task<E, A> {
		return new Task((rej, _) => rej(e));
	}
}
