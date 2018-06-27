interface Elementos {
	areaTelaD: HTMLDivElement;
	linksCriar: HTMLAnchorElement[];
	tabela: HTMLTableElement;
}

interface Estado {}

declare enum Actions {
	INIT,
}

interface Renderizado {
	reducer: Reducer<Action, Estado>;
	subscriber: Subscriber<Estado>;
}

type Reducer<A, B> = (acc: B, a: A) => B;
interface Action {
	type: Actions;
}

interface Store<A> {
	subscribe(sub: Subscriber<A>): Unsubscribe;
	dispatch(action: Action): void;
}
type Subscriber<A> = (state: A, oldState: A) => void;
type Unsubscribe = () => void;
