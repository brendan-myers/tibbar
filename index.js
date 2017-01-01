const worker = require('./lib/worker.js');

exports.worker = function(options) {
	return new worker.default(options);
}

const client = require('./lib/client.js');

exports.client = function(options) {
	return new client.default(options);
}