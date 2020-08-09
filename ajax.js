Module.add('ajax',function(){

let Ajax = {}

Ajax.get = function (url, data, async) {
	return new Promise((resolve, reject) => {
		let query = [];
		for (let key in data || {}) {
			query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
		}

		const req = new XMLHttpRequest();
		req.open('GET', url + (query.length ? '?' + query.join('&') : ''));
		req.onload = () => req.status === 200 ? resolve(req.response) : reject(Error(req.statusText));
		req.onerror = (e) => reject(Error(`Ajax Network Error: ${e}`));
		req.send();
	});
}

Ajax.post = function (url, data, callback, async) {
	return new Promise((resolve, reject) => {
		let query = [];
		for (let key in data) {
			query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
		}
		const req = new XMLHttpRequest();
		req.open('POST', url);
		req.onload = () => req.status === 200 ? resolve(req.response) : reject(Error(req.statusText));
		req.onerror = (e) => reject(Error(`Ajax Network Error: ${e}`));
		req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		req.send( query.join('&') );
	});
};

return {
	Ajax: Ajax
}

});
