import StatusFormulario from './StatusFormulario';
import { Actions, Action } from './Actions';
import Estado from './Estado';

type Elementos = {
	areaTelaD: HTMLDivElement;
	linksCriar: HTMLAnchorElement[];
	tabela: HTMLTableElement;
};

interface Renderizado {
	reducer: Reducer<Action, Estado>;
	subscriber: (store: Store<Estado>) => void;
}

type Transducer<A, B, C> = (next: Reducer<B, C>) => Reducer<A, C>;
type Reducer<A, B> = (acc: B, a: A) => B;

interface Store<A> {
	dispatch(action: Action): void;
	getState(): A;
	subscribe(sub: Subscriber<A>): Unsubscribe;
}
type Subscriber<A> = (state: A, oldState: A) => void;
type Unsubscribe = () => void;
