const debug = require('debug')('tibbar:application');
import amqp from 'amqplib';
import Client from './client';
import Worker from './worker';

export default class Application {
	constructor(options) {
		this._client = new Client(options ? options.client : null);
		this._worker = new Worker(options ? options.worker : null);
	}


	connect(url) {
		debug(`Connecting ${url}`);

		return amqp.connect(url).then(conn => {
			this._conn = conn;
			this._worker._conn = conn;
			this._client._conn = conn;

			const promises = [];

			promises.push(this._worker._createChannel(conn));
			promises.push(this._client._createChannel(conn));

			return Promise.all(promises);
		});
	}


	disconnect() {
		debug(`Disconnecting`);

		if (!this._conn) {
			debug('Disconnecting: Not connected');
			throw 'Disconnecting: Not connected';
		}

		const promises = [];

		promises.push(this._worker._closeChannel());
		promises.push(this._client._closeChannel());

		return Promise.all(promises).then(() => {
			return this._conn.close();
		}).then(() => {
			delete this._conn;
			debug('Disconnected');
		});
	}


	accept(name, callback) {
		return this._worker.accept(name, callback);
	}
	

	cast(endpoint, payload) {
		return this._client.cast(endpoint, payload);
	}


	call(endpoint, payload, timeout) {
		return this._client.call(endpoint, payload, timeout);
	}
}