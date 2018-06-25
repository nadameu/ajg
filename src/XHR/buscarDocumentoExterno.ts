export default function buscarDocumentoExterno(url: string): Promise<Document> {
	return new Promise((resolve, reject) => {
		const options: GMXMLHttpRequestOptions = {
			method: 'GET',
			url: url,
			onload: obj => {
				const parser = new DOMParser();
				resolve(parser.parseFromString(obj.responseText, 'text/html'));
			},
			onerror: reject,
		};
		GM_xmlhttpRequest(options);
	});
}
