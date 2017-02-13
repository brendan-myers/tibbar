const debug = require('debug')('tibbar:client');
import amqp from 'amqplib';
import assert from 'assert';
import emitter from 'events';
import os from 'os';

const defaultOptions = {
	consume: {
		exclusive: true,
		durable: true,
		autoDelete: false,
		arguments: null,
		noAck: true,
	},
	timeout: 1000,
	replyTo: 'amq.rabbitmq.reply-to'
};

export default class Client {
	constructor(options) {
		this._options = Object.assign(defaultOptions, options);
	}


	connect(url) {
		return amqp.connect(url).then(conn => {
			this._conn = conn;
			return this._conn.createChannel();
		}).then(ch => {
			this._ch = ch;

			this._ch.emitter = new emitter();
			this._ch.emitter.setMaxListeners(0);
			this._ch.consume(
				this._options.replyTo,
				msg => this._ch.emitter.emit(msg.properties.correlationId, msg),
				this._options.consume
			);
			
			return Promise.resolve();
		});
	}


	disconnect() {
		debug(`Disconnecting`);

		if (!this._conn) {
			debug('Disconnecting: Not connected');
			throw 'Disconnecting: Not connected';
		}

		this._conn.close().then(() => {
			debug('Disconnected');
		});
	}


	cast(endpoint, payload) {
		if (!this._conn) {
			debug(`Casting ${endpoint}: Not connected`);
			throw `Casting ${endpoint}: Not connected`;
		}

		payload = this._formatPayload(payload);

		debug(`Casting ${endpoint}(${payload})`);

		this._send(endpoint, payload);
	}


	call(endpoint, payload, timeout) {
		if (!this._conn) {
			debug(`Calling ${endpoint}: Not connected`);
			throw `Calling ${endpoint}: Not connected`;
		}

		payload = this._formatPayload(payload);

		const id = _generateUuid();
		
		return new Promise((resolve, reject) => {
			debug(`Calling ${endpoint}(${payload})`);

			const timer = setTimeout(() => { 
				debug(`[${endpoint}] Timed out`, timeout || this._options.timeout);
				this._ch.emitter.removeAllListeners(id);
				reject('Timed out');
			}, timeout || this._options.timeout);

			const cb = (msg) => {
				if (msg && msg.properties.correlationId == id) {
					clearTimeout(timer);

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

			this._ch.emitter.once(id, cb);

			this._send(
				endpoint,
				payload,
				{
					correlationId: id,
					replyTo: this._options.replyTo,
					expiration: timeout || this._options.timeout
				}
			);
		});
	}


	_send(endpoint, payload, options={}) {
		return this._ch.sendToQueue(
			endpoint,
			new Buffer(payload),
			options
		);
	}


	_formatPayload(payload) {
		return !payload ? '{}' : JSON.stringify(payload);
	}
}

function _generateUuid() {
	return os.hostname() +
		Math.random().toString() +
		Math.random().toString();
}