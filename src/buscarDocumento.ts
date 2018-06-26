import { Task } from './Task';

export default function buscarDocumento(
	url: string,
	method = 'GET',
	data: any = null
): Task<Error, Document> {
	return new Task((rej, res) => {
		const xhr = new XMLHttpRequest();
		xhr.open(method, url);
		xhr.responseType = 'document';
		xhr.addEventListener('load', () => res(xhr.response));
		xhr.addEventListener('error', evt => rej(new Error(evt.message)));
		xhr.send(data);
	});
}
