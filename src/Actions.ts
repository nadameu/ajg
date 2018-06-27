export enum Actions {
	FORMULARIO_CARREGANDO,
	FORMULARIO_CARREGADO,
	FORMULARIO_VALIDO,
	FORMULARIO_INVALIDO,
}

export interface Action {
	type: Actions;
}
