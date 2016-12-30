const amqp = require('amqplib/callback_api');
const assert = require('assert')

export default class Tibbar {
	constructor (options) {
		if (!options) {
			options = {};
		}

		this._queues = {};
		this._options = {
			assertQueue: options.assertQueue || { durable: false },
			prefetch: options.prefetch || 1,
		};
	}

	use (name, callback) {
		assert(!this._queues[name], `"${name}" already exists`);

		this._queues[name] = [];
		this._queues[name].callback = callback;

		return this;
	}

	connect (url) {
		amqp.connect(url, (err, conn) => {
			for (let q in this._queues) {
				console.log(`Configuring [${q}]`);

				let queue = this._queues[q];

				conn.createChannel((err, ch) => {
					ch.assertQueue(q, this._options.assertQueue);
					ch.prefetch(this._options.prefetch);

					const cb = (msg) => {
						if (!msg.properties.replyTo | msg.properties.correlationId) {
							return;
						}

						const res = queue.callback(msg, ch);

						ch.sendToQueue(
							msg.properties.replyTo,
							new Buffer(res),
							{ correlationId: msg.properties.correlationId }
						);

						ch.ack(msg);
					};

					ch.consume(q, cb);
				});
			}
		});
	}
}