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
	prefetch: 1,
}

export default class Worker {
	constructor(options) {
		this._queues = {};
		this._options = Object.assign(defaultOptions, options);
	}


	use(name, callback) {
		assert(!this._queues[name], `'${name}'' already exists`);

		debug(`Adding queue '${name}'`);

		this._queues[name] = {};
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
			if (!msg) {
				return;
			}

			debug(`[${q}] Received`);
			debug(`[${q}] fields: ${JSON.stringify(msg.fields)}`);
			debug(`[${q}] properties: ${JSON.stringify(msg.properties)}`);
			debug(`[${q}] content: ${msg.content.toString()}`);

			const request = new Request(msg);
			const response = new Response(this._ch, msg);

			queue.callback(request, response);
		};

		return this._ch.consume(q, cb);
	}


	_closeQueue(q) {
		debug(`[${q}] Closing`);

		this._ch.deleteQueue(q);
		delete this._queues[q];
	}
}