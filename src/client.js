const debug = require('debug')('tibbar:client');
import amqp from 'amqplib';
import assert from 'assert';
import os from 'os';

export default class Client {
	constructor(options) { // todo assign option values
		this._options = {
			assertQueue: {
				exclusive: true,
				durable: true,
				autoDelete: false,
				arguments: null
			},
			timeout: 1000,
		}

		this._waiting = {};
	}


	connect(url) {
		return amqp.connect(url).then(conn => {
			this._conn = conn;
			return this._conn.createChannel();
		}).then(ch => {
			this._ch = ch;
			return Promise.resolve();
		});
	}


	disconnect() {
		debug(`Disconnecting`);

		if (!this._conn) {
			debug(`Not connected`);
			throw 'Not connected';
		}

		this._removeAllWaiting();

		this._conn.close().then(() => {
			debug('Disconnected');
		});
	}


	cast(endpoint, params, timeout, options={}) {
		params = this._formatParams(params);

		debug(`Casting ${endpoint}(${params})`);

		this._send(endpoint, params, options);
	}


	call(endpoint, params, timeout) {
		params = this._formatParams(params);

		const id = _generateUuid();
		this._addToWaiting(id, null);
		
		return new Promise((resolve, reject) => {
			debug(`Calling ${endpoint}(${params})`);

			const timer = setTimeout(() => { 
				debug(`[${endpoint}] Timed out`, timeout || this._options.timeout);
				
				this._removeFromWaiting(id);

				reject('Timed out');
			}, timeout || this._options.timeout);

			return this._ch.assertQueue('', this._options.assertQueue).then((q) => {
				this._addToWaiting(id, q);

				const cb = (msg) => {
					if (msg && msg.properties.correlationId == id) {
						clearTimeout(timer);

						this._removeFromWaiting(id);

						const res = JSON.parse(msg.content.toString());

						debug(`[${endpoint}] Received`);
						debug(`[${endpoint}] fields: ${JSON.stringify(msg.fields)}`);
						debug(`[${endpoint}] properties: ${JSON.stringify(msg.properties)}`);
						debug(`[${endpoint}] content: ${msg.content.toString()}`);

						if (res.type == 'exception') {
							reject(res);
						} else {
							resolve(res.body);
						}
					}
				};

				this._ch.consume(q.queue, cb);

				this._send(
					endpoint,
					params,
					{
						correlationId: id,
						replyTo: q.queue,
						expiration: timeout || this._options.timeout
					}
				);
			});
		});
	}


	_send(endpoint, params, options={}) {
		return this._ch.sendToQueue(
			endpoint,
			new Buffer(params),
			options
		);
	}


	_addToWaiting(id, q) {
		this._waiting[id] = q;
	}


	_removeFromWaiting(id) {
		if (this._ch && this._waiting[id] && this._waiting[id].queue) {
			debug(`Removing ${id}`);
			this._ch.deleteQueue(this._waiting[id].queue).catch(() => {}); // see https://github.com/squaremo/amqp.node/issues/250
		}

		delete this._waiting[id];
	}


	_removeAllWaiting() {
		for (let key in Object.keys(this._waiting)) {
			_removeFromWaiting(key);
		}
	}


	_formatParams(params) {
		return !params ? '{}' : JSON.stringify(params);
	}
}

function _generateUuid() {
	return os.hostname() +
		Math.random().toString() +
		Math.random().toString();
}