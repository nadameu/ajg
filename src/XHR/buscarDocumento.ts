export default function buscarDocumento(url: string): Promise<Document> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('GET', url);
		xhr.responseType = 'document';
		xhr.addEventListener('load', () => {
			resolve(<Document>xhr.response);
		});
		xhr.addEventListener('error', reject);
		xhr.send(null);
	});
}
