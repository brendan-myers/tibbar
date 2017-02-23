const debug = require('debug')('tibbar:worker');
import assert from 'assert';
import amqp from 'amqplib';
import Request from './request';
import Response from './response';

const defaultOptions = {
	assertQueue: {
		exclusive: false,
		durable: false,
		autoDelete: false,
		arguments: null
	},
	prefetch: 1
};

export default class Worker {
	constructor(options) {
		this._queues = {};
		this._middlewares = [];
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
		});
	}


	accept(name, callback) {
		debug(`.accept() name='${name}', callback='${name}'`);

		assert(!this._queues[name], `'${name}'' already exists`);

		this._queues[name] = {};
		this._queues[name].callback = callback;

		if (this._ch) {
			return this._openQueue(name);
		}
	}


	use(middleware) {
		debug(`.use() middleware=${middleware}`);

		return this._middlewares.push(middleware);
	}


	_createChannel(connection) {
		debug('_createChannel()');

		// Yuck, but amqplib-mock doesn't return a promise from createChannel()
		return new Promise((resolve, reject) => {
			return resolve(connection.createChannel());
		}).then(ch => {
			this._ch = ch;
			
			this._ch.on('close', () =>
				debug('event: channel closed')
			);
			this._ch.on('error', error =>
				debug('event: channel error:', error)
			);

			const promises = [];

			for (let q in this._queues) {
				promises.push(this._openQueue(q));
			}

			return Promise.all(promises);
		});
	}


	_closeChannel() {
		debug('_closeChannel()');

		const promises = [];

		for (let q in this._queues) {
			promises.push(this._closeQueue(q));
		}

		return Promise.all(promises).then(() => {
			return this._ch.close;
		});
	}


	_openQueue(q) {
		debug(`._openQueue() q=${q}`);

		const queue = this._queues[q];

		this._ch.assertQueue(q, this._options.assertQueue);
		this._ch.prefetch(this._options.prefetch);

		const cb = (msg) => {
			if (!msg) {
				return;
			}

			debug(`.callback() q=${q}`);
			debug(`    fields=${JSON.stringify(msg.fields)}`);
			debug(`    properties=${JSON.stringify(msg.properties)}`);
			debug(`    content=${msg.content.toString()}`);

			const request = new Request(msg);
			const response = new Response(this._ch, msg);

			this._execCallback(0, request, response, queue.callback);
		};

		return this._ch.consume(q, cb);
	}


	_closeQueue(q) {
		debug(`._closeQueue() q=${q}`);

		const promise = this._ch.deleteQueue(q);
		delete this._queues[q];
		return promise;
	}


	_execCallback(i, request, response, last) {
		debug(`_execCallback() i=${i}`);

		if (i === this._middlewares.length) {
			debug('    executing callback');
			return last(request, response);
		}

		debug('    executing middleware');
		return this._middlewares[i](
			request,
			response,
			() => { 
				return new Promise((resolve, reject) => {
					try {
						resolve(this._execCallback(i+1, request, response, last));
					} catch (error) {
						reject(error);
					}
				});
			}
		);
	}
}