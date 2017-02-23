const debug = require('debug')('tibbar:application');
import amqp from 'amqplib';
import Client from './client';
import Worker from './worker';

export default class Application {
	constructor(options) {
		debug(`.constructor() options=${JSON.stringify(options)}`);

		this._client = new Client(options ? options.client : null);
		this._worker = new Worker(options ? options.worker : null);
	}


	connect(url) {
		debug(`.connect() url=${url}`);

		return amqp.connect(url).then(conn => {
			this._conn = conn;
			this._worker.connection = conn;
			this._client.connection = conn;

			const promises = [];

			promises.push(this._worker._createChannel(conn));
			promises.push(this._client._createChannel(conn));

			return Promise.all(promises);
		});
	}


	disconnect() {
		debug('.disconnect()');

		if (!this._conn) {
			debug('    error: Not connected');
			throw 'Disconnecting: Not connected';
		}

		const promises = [];

		promises.push(this._worker._closeChannel());
		promises.push(this._client._closeChannel());

		return Promise.all(promises).then(() => {
			return this._conn.close();
		}).then(() => {
			delete this._conn;
			debug('    success: disconnected');
		});
	}


	accept(name, callback) {
		return this._worker.accept(name, callback);
	}


	use(middleware) {
		return this._worker.use(middleware);
	}
	

	cast(endpoint, payload) {
		return this._client.cast(endpoint, payload);
	}


	call(endpoint, payload, timeout) {
		return this._client.call(endpoint, payload, timeout);
	}


	get worker() {
		return this._worker;
	}


	get client() {
		return this._client;
	}
}