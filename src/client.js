const debug = require('debug')('tibbar:client');
import amqp from 'amqplib';
import Content from './content';
import emitter from 'events';
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

		debug(`.constructor() options=${JSON.stringify(options)}`);
		debug(`    _options=${JSON.stringify(this._options)}`);
	}


	set connection(conn) {
		this._conn = conn;
	}


	connect(url) {
		debug(`.connect() url=${url}`);

		return amqp.connect(url).then(conn => {
			this._conn = conn;

			this._conn.on('close', () =>
				debug('event: connection closed')
			);
			this._conn.on('error', error =>
				debug('event: connection error:', error)
			);

			return this._createChannel(this._conn);
		});
	}


	disconnect() {
		debug('.disconnect()');

		if (!this._conn) {
			debug('    error: Not connected');
			throw 'Disconnecting: Not connected';
		}

		this._closeChannel().then(() => {
			return this._conn.close();
		}).then(() => {
			delete this._conn;
			debug('    success: disconnected');
		}).catch(error => {
			debug(`    error: ${error.message}`)
		});
	}


	cast(route, payload, options) {
		debug(`.cast() route=${route} payload=${JSON.stringify(payload)} options=${options}`);

		if (!this._conn) {
			debug(`    error: Not connected`);
			throw `Casting ${route}: Not connected`;
		}

		this._send(route, payload, options);
	}


	call(route, payload, timeout) {
		debug(`.call() route=${route} payload=${JSON.stringify(payload)} timeout=${timeout}`);

		if (!this._conn) {
			debug(`    error: Not connected`);
			throw `Calling ${route}: Not connected`;
		}

		const id = Util.generateUuid();
		
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => { 
				debug(`error: call to ${route} timed out`, timeout || this._options.timeout);
				this._ch.emitter.removeAllListeners(id);
				reject(`error: call to ${route} timed out`);
			}, timeout || this._options.timeout);

			const cb = (msg) => {
				if (msg && msg.properties.correlationId == id) {
					clearTimeout(timer);

					debug(`.callback() route=${route}`);
					debug(`    fields=${JSON.stringify(msg.fields)}`);
					debug(`    properties=${JSON.stringify(msg.properties)}`);
					debug(`    content=${msg.content.toString()}`);

					const response = new Content(msg.content);

					resolve(response);
				}
			};

			this._ch.emitter.once(id, cb);

			this._send(
				route,
				payload,
				{
					correlationId: id,
					replyTo: this._options.replyTo,
					expiration: timeout || this._options.timeout
				}
			);
		});
	}


	_createChannel(connection) {
		debug('._createChannel()');

		// Yuck, but amqplib-mock doesn't return a promise from createChannel()
		return new Promise((resolve, reject) => {
			resolve(connection.createChannel());
		}).then(ch => {
			this._ch = ch;

			this._ch.emitter = new emitter();
			this._ch.emitter.setMaxListeners(0);
			this._ch.consume(
				this._options.replyTo,
				msg => this._ch.emitter.emit(msg.properties.correlationId, msg),
				this._options.consume
			);
			
			this._ch.on('close', () =>
				debug('event: channel closed')
			);
			this._ch.on('error', error =>
				debug('event: channel error:', error)
			);

			return Promise.resolve();
		});
	}


	_closeChannel() {
		debug('._closeChannel()');
		debug(`    tag=${this._options.consume.consumerTag}`);

		return this._ch.cancel(this._options.consume.consumerTag).then(() => {
			return this._ch.close();
		});
	}


	_send(route, payload, options={}) {
		debug(`._send() route=${route} payload=${JSON.stringify(payload)} options=${options}`);

		return this._ch.sendToQueue(
			route,
			Util.prepareBuffer(payload),
			options
		);
	}
}