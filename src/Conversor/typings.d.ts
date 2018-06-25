interface Conversor<T> {
	converter: (valor: T) => string;
}

interface Analisador<T> {
	analisar: (texto: string) => T;
}

type AnalisadorConversor<T> = Analisador<T> & Conversor<T>;

interface Valores {
	principal: number;
	juros: number;
	total: number;
}
