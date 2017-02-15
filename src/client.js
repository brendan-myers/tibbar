const debug = require('debug')('tibbar:client');
import amqp from 'amqplib';
import emitter from 'events';
import Content from './content';
import * as Util from './util';

const defaultOptions = {
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
			
			this._conn.on('close', () => debug('Connection closed'));
			this._conn.on('error', error => debug('Connection error:', error));
			this._ch.on('close', () => debug('Channel closed'));
			this._ch.on('error', error => debug('Channel error:', error));

			return Promise.resolve();
		});
	}


	disconnect() {
		debug(`Disconnecting`);

		if (!this._conn) {
			debug('Disconnecting: Not connected');
			throw 'Disconnecting: Not connected';
		}

		this._ch.cancel(this._options.consume.consumerTag).then(() => {
			return this._ch.close();
		}).then(() => {
			return this._conn.close();
		}).then(() =>
			debug('Disconnected')
		).catch(error =>
			debug('Discconect error:', error.message)
		);
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
				debug(`[${endpoint}] Timed out`, timeout || this._options.timeout);
				this._ch.emitter.removeAllListeners(id);
				reject('Timed out');
			}, timeout || this._options.timeout);

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
			Util.prepareBuffer(payload),
			options
		);
	}
}