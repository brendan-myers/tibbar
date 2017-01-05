const debug = require('debug')('tibbar:worker');
import assert from 'assert';
import amqp from 'amqplib';

export default class Worker {
	constructor(options) { // todo assign option values
		this._queues = {};
		this._options = {
			assertQueue: {
				exclusive: false,
				durable: false,
				autoDelete: false,
				arguments: null
			},
			prefetch: 1,
		};
	}


	use(name, callback) {
		assert(!this._queues[name], `'${name}'' already exists`);

		debug(`Adding queue '${name}'`);

		this._queues[name] = [];
		this._queues[name].callback = callback;

		if (this._ch) {
			this._openQueue(name);
		}
	}


	disconnect() {
		if (this._conn) {
			this._conn.close();
			delete this._conn;
		}
	}


	connect(url) {
		debug(`Connecting ${url}`);

		return amqp.connect(url).then(conn => {
			this._conn = conn;
			return conn.createChannel();
		}).then(ch => {
			this._ch = ch;

			const promises = [];

			for (let q in this._queues) {
				promises.push(this._openQueue(q));
			}

			return Promise.all(promises);
		});
	}


	_openQueue(q) {
		debug(`[${q}] Opening`);

		const queue = this._queues[q];

		this._ch.assertQueue(q, this._options.assertQueue);
		this._ch.prefetch(this._options.prefetch);

		const cb = (msg) => {
			debug(`[${q}] Receive: ${JSON.stringify(msg)}`);

			try {
				const res = queue.callback(JSON.parse(msg.content.toString()));

				if (!msg.properties.replyTo || !msg.properties.correlationId) {
					debug(`[${q}] No response`);
					this._ch.ack(msg);
				} else if ('function' === typeof res.then) {	// if res is a Promise
					res.then(p => {
						debug(`[${q}] Respond: ${JSON.stringify(p)}`);
						this._sendResponse(p, msg);
					}).catch(ex => {
						debug(`[${q}] Exception: ${JSON.stringify(ex)}`);
						this._sendResponse(null, msg, ex);
					});
				} else {
					debug(`[${q}] Respond: ${JSON.stringify(res)}`);
					this._sendResponse(res, msg);
				}
			} catch (ex) {
				debug(`[${q}] Exception: ${JSON.stringify(ex)}`);
				this._sendResponse(null, msg, ex);
			}
		};

		return this._ch.consume(q, cb);
	}


	_closeQueue(q) {
		debug(`[${q}] Closing`);

		this._ch.deleteQueue(q);
		delete this._queues[q];
	}


	_sendResponse(payload, msg, exception) {
		if (!msg) {
			return;
		}
		
		let buffer;

		if (!exception) {
			buffer = new Buffer(JSON.stringify({
				type: 'response',
				body: payload
			}));
		} else {
			buffer = new Buffer(JSON.stringify({
				type: 'exception',
				name: exception.constructor.name,
				body: exception
			}));
		}

		this._ch.sendToQueue(
			/* queue   */ msg.properties.replyTo,
			/* payload */ buffer,
			/* options */ { correlationId: msg.properties.correlationId },
		);

		this._ch.ack(msg);
	};
}