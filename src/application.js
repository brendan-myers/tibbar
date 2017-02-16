const debug = require('debug')('tibbar:application');
import assert from 'assert';
import amqp from 'amqplib';
import Content from './content';
import emitter from 'events';
import Request from './request';
import Response from './response';
import * as Util from './util';

const defaultOptions = {
	// Worker defaults
	worker: {
		assertQueue: {
			exclusive: false,
			durable: false,
			autoDelete: false,
			arguments: null
		},
		prefetch: 1
	},

	// Client defaults
	client: {
		consume: {
			exclusive: true,
			durable: true,
			autoDelete: false,
			arguments: null,
			noAck: true,
			consumerTag: 'client'
		},
		timeout: 1000,
		replyTo: 'amq.rabbitmq.reply-to'
	}
}

export default class Application {
	constructor(options) {
		this._client = {};
		this._worker = {
			queues: {}
		};
		this._options = Object.assign(defaultOptions, options);
	}


	connect(url) {
		debug(`Connecting ${url}`);

		return amqp.connect(url).then(conn => {
			this._conn = conn;

			this._conn.on('close', () =>
				debug('Connection closed')
			);
			this._conn.on('error', error =>
				debug('Connection error:', error)
			);

			return conn.createChannel();
		}).then(ch => {
			this._worker.ch = ch;

			const promises = [];

			for (let q in this._worker.queues) {
				promises.push(this._openQueue(q));
			}

			return Promise.all(promises);
		}).then(() => {
			return this._conn.createChannel();
		}).then(ch => {
			this._client.ch = ch;

			this._client.ch.emitter = new emitter();
			this._client.ch.emitter.setMaxListeners(0);
			this._client.ch.consume(
				this._options.client.replyTo,
				msg => this._client.ch.emitter.emit(msg.properties.correlationId, msg),
				this._options.client.consume
			);
			
			this._client.ch.on('close', () =>
				debug('Channel closed')
			);
			this._client.ch.on('error', error =>
				debug('Channel error:', error)
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

		const promises = [];

		for (let q in this._worker.queues) {
			promises.push(this._closeQueue(q));
		}

		Promise.all(promises).then(() => {
			return this._worker.ch.close;
		}).then(() => {
			return this._client.ch.cancel(this._options.client.consume.consumerTag);
		}).then(() => {
			return this._client.ch.close();
		}).then(() => {
			return this._conn.close();
		}).then(() => {
			delete this._conn;
			debug('Disconnected')
		}).catch(error =>
			debug('Discconect error:', error.message)
		);
	}


	_openQueue(q) {
		debug(`[${q}] Opening`);

		const queue = this._worker.queues[q];

		this._worker.ch.assertQueue(q, this._options.worker.assertQueue);
		this._worker.ch.prefetch(this._options.worker.prefetch);

		const cb = (msg) => {
			if (!msg) {
				return;
			}

			debug(`[${q}] Received`);
			debug(`[${q}] fields: ${JSON.stringify(msg.fields)}`);
			debug(`[${q}] properties: ${JSON.stringify(msg.properties)}`);
			debug(`[${q}] content: ${msg.content.toString()}`);

			const request = new Request(msg);
			const response = new Response(this._worker.ch, msg);

			queue.callback(request, response);
		};

		return this._worker.ch.consume(q, cb);
	}


	_closeQueue(q) {
		debug(`[${q}] Closing`);

		const promise = this._worker.ch.deleteQueue(q);
		delete this._worker.queues[q];
		return promise;
	}


	accept(name, callback) {
		assert(!this._worker.queues[name], `'${name}'' already exists`);

		debug(`Adding queue '${name}'`);

		this._worker.queues[name] = {};
		this._worker.queues[name].callback = callback;

		if (this._worker.ch) {
			this._openQueue(name);
		}
	}
	

	cast(endpoint, payload) {
		if (!this._conn) {
			debug(`Casting ${endpoint}: Not connected`);
			throw `Casting ${endpoint}: Not connected`;
		}

		debug(`Casting ${endpoint}(${payload})`);

		this._send(endpoint, payload);
	}


	call(endpoint, payload, timeout) {
		if (!this._conn) {
			debug(`Calling ${endpoint}: Not connected`);
			throw `Calling ${endpoint}: Not connected`;
		}

		const id = Util.generateUuid();
		
		return new Promise((resolve, reject) => {
			debug(`Calling ${endpoint}(${payload})`);

			const timer = setTimeout(() => { 
				debug(`[${endpoint}] Timed out`, timeout || this._options.client.timeout);
				this._client.ch.emitter.removeAllListeners(id);
				reject('Timed out');
			}, timeout || this._options.client.timeout);

			const cb = (msg) => {
				if (msg && msg.properties.correlationId == id) {
					clearTimeout(timer);

					debug(`[${endpoint}] Received`);
					debug(`[${endpoint}] fields: ${JSON.stringify(msg.fields)}`);
					debug(`[${endpoint}] properties: ${JSON.stringify(msg.properties)}`);
					debug(`[${endpoint}] content: ${msg.content.toString()}`);

					const response = new Content(msg.content);

					resolve(response);
				}
			};

			this._client.ch.emitter.once(id, cb);

			this._send(
				endpoint,
				payload,
				{
					correlationId: id,
					replyTo: this._options.client.replyTo,
					expiration: timeout || this._options.client.timeout
				}
			);
		});
	}


	_send(endpoint, payload, options={}) {
		return this._client.ch.sendToQueue(
			endpoint,
			Util.prepareBuffer(payload),
			options
		);
	}
}