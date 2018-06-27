export default function createStore(
	reducer: Reducer<Action, Estado>,
	estadoInicial: Estado
): Store<Estado> {
	let subscribers: Subscriber<Estado>[] = [];
	function subscribe(sub: Subscriber<Estado>): Unsubscribe {
		subscribers.push(sub);
		return () => {
			subscribers = subscribers.filter(s => s !== sub);
		};
	}
	let estado = estadoInicial;
	function dispatch(action: Action): void {
		const estadoAntigo = estado;
		estado = reducer(estado, action);
		subscribers.forEach(sub => sub(estado, estadoAntigo));
	}
	dispatch({ type: Actions.INIT });
	return { dispatch, subscribe };
}
