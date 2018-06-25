export default function buscarDocumento(
	url: string,
	method = 'GET',
	data: any = null
): Promise<Document> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open(method, url);
		xhr.responseType = 'document';
		xhr.addEventListener('load', () => resolve(xhr.response));
		xhr.addEventListener('error', reject);
		xhr.send(data);
	});
}
