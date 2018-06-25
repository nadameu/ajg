export default {
	criar(texto: string, handler: EventHandlerNonNull) {
		const botao = document.createElement('button');
		botao.className = 'infraButton';
		botao.textContent = texto;
		botao.addEventListener('click', handler);
		return botao;
	},
};
