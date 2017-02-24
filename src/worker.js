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


/**
 * Basic worker service.
 */
export default class Worker {
	/**
	 * @param {Object} options - Default values to use when creating AMQP channels and queues.
	 *                           See RabbitMQ docs (http://www.rabbitmq.com/amqp-0-9-1-reference.html) for more details.
	 * @param {Object} options.assertQueue
	 * @param {boolean} options.assertQueue.exclusive
	 * @param {boolean} options.assertQueue.durable
	 * @param {boolean} options.assertQueue.autoDelete
	 * @param {boolean} options.assertQueue.arguments
	 * @param {boolean} options.prefetch
	 */
	constructor(options) {
		this._queues = {};
		this._middlewares = [];
		this._options = Object.assign(defaultOptions, options);

		debug(`.constructor() options=${JSON.stringify(options)}`);
		debug(`    _options=${JSON.stringify(this._options)}`);
	}


	/**
	 * Manually set the amqplib connection that the worker will use.
	 * @param {Object} conn - An amqplib connection.
	 */
	set connection(conn) {
		this._conn = conn;
	}


	/**
	 * Open a connection to the RabbitMQ server.
	 * @param {string} url - Address of the RabbitMQ server to connect to.
	 * @return {Promise} Promise that resolves when the connection is made, channel is open, and outstanding queues are asserted.
	 */
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


	/**
	 * Disconnect from the RabbitMQ server.
	 * @throws {error} Throw error when not connected.
	 */
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


	/**
	 * Bind a callback handler to a route.
	 * @param {string} route - Route to bind callback handler to.
	 * @param {function} callback - handler to execute when a request is received on the given route.
	 */
	accept(route, callback) {
		debug(`.accept() route='${route}', callback='${callback}'`);

		assert(!this._queues[route], `'${route}'' already exists`);

		this._queues[route] = {};
		this._queues[route].callback = callback;

		if (this._ch) {
			return this._openQueue(route);
		}
	}


	/**
	 * Set a middleware function that will execute for each request on a bound route before the callback handler is called.
	 * @param {function} middleware - Middleware function to use.
	 * @return {number} Count totalling number of middleware functions loaded.
	 */
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