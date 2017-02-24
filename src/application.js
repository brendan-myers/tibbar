const debug = require('debug')('tibbar:application');
import amqp from 'amqplib';
import Client from './client';
import Worker from './worker';

/**
 * A thin wrapper that encapsulates a Worker and Client instance. Useful for when both worker/client functionality is needed (eg a worker that will need to call other workers).
 *
 * Both client/worker share the same connection to a RabbitMQ server.
 */
export default class Application {
	/**
	 * @param {Object} options
	 * @param {Object} options.worker - default values to use when creating AMQP channels and queues. See RabbitMQ docs (http://www.rabbitmq.com/amqp-0-9-1-reference.html) for more details.
	 * @param {Object} options.worker.assertQueue
	 * @param {boolean} options.worker.assertQueue.exclusive
	 * @param {boolean} options.worker.assertQueue.durable
	 * @param {boolean} options.worker.assertQueue.autoDelete
	 * @param {boolean} options.worker.assertQueue.arguments
	 * @param {boolean} options.worker.prefetch
	 */
	constructor(options) {
		debug(`.constructor() options=${JSON.stringify(options)}`);

		this._client = new Client(options ? options.client : null);
		this._worker = new Worker(options ? options.worker : null);
	}

	/**
	 * Open a connection to the RabbitMQ server.
	 * @param {string} url - Address of the RabbitMQ server to connect to.
	 * @return {Promise} Promise that resolves when the connection is made and channels/outstanding queues are open.
	 */
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


	/**
	 * Bind a callback handler to a route.
	 * @param {string} route - Route to bind callback handler to.
	 * @param {function} callback - handler to execute when a request is received on the given route.
	 */
	accept(route, callback) {
		return this._worker.accept(route, callback);
	}

	/**
	 * Set a middleware function that will execute for each request on a bound route before the callback handler is called.
	 * @param {function} middleware - Middleware function to use.
	 * @return {number} Count totalling number of middleware functions loaded.
	 */
	use(middleware) {
		return this._worker.use(middleware);
	}


	/**
	 * Send a message to the specified queue, but don't receive a response from the worker.
	 * @param {string} route - Route to send message to.
	 * @param {Buffer|string|number|object} payload - Message/payload to send to specified route.
	 * @param {Object} options - aqmp message options. Useful when forwarding requests/messages to another worker.
	 * @throws {error} Throw error when not connected.
	 */
	cast(route, payload, options) {
		return this._client.cast(route, payload, options);
	}


	/**
	 * Send a request to the specified queue.
	 * @param {string} route - Route to send request to.
	 * @param {Buffer|string|number|object} payload - Message/payload to send attach to the request.
	 * @param {number} timeout - Timeout (ms) to wait for a response.
	 * @throws {error} Throw error when not connected.
	 * @throws {error} Throw error when request times out.
	 * @return {Promise<Response>} A promise that resolves to the response from the worker.
	 */
	call(route, payload, timeout) {
		return this._client.call(route, payload, timeout);
	}


	/**
	 * @return {Worker} The underlying Worker instance.
	 */
	get worker() {
		return this._worker;
	}


	/**
	 * @return {Client} The underlying Client instance.
	 */
	get client() {
		return this._client;
	}
}