import { Action, Actions } from './Actions';
import Estado from './Estado';
import { Subscriber, Reducer, Store, Unsubscribe } from './typings';

export default function createStore(
	reducer: Reducer<Action, Estado>
): Store<Estado> {
	let subscribers: Subscriber<Estado>[] = [];
	function subscribe(sub: Subscriber<Estado>): Unsubscribe {
		subscribers.push(sub);
		return () => {
			subscribers = subscribers.filter(s => s !== sub);
		};
	}
	let estado: Estado = reducer(<any>undefined, <any>{});
	console.log('=ESTADO INICIAL=', estado);
	function getState() {
		return estado;
	}
	function dispatch(action: Action): void {
		const estadoAntigo = estado;
		estado = reducer(estado, action);
		console.log('=ESTADO=', estado);
		subscribers.forEach(sub => sub(estado, estadoAntigo));
	}
	return { dispatch, getState, subscribe };
}
