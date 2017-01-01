const amqp = require('amqplib');
const assert = require('assert');
const debug = require('debug')('tibbar:worker');

export default class Worker {
	constructor () {
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


	use (name, callback) {
		debug(`Adding queue '${name}'`);

		assert(!this._queues[name], `'${name}'' already exists`);

		this._queues[name] = [];
		this._queues[name].callback = callback;
	}


	connect (url) {
		return amqp.connect(url).then(conn => {
			for (let q in this._queues) {
				const queue = this._queues[q];

				conn.createChannel().then(ch => {
					ch.assertQueue(q, this._options.assertQueue);
					ch.prefetch(this._options.prefetch);

					const cb = (msg) => {
						debug(`[${q}] Receive: ${JSON.stringify(msg)}`);

						if (!msg.properties.replyTo | !msg.properties.correlationId) {
							debug(`[${q}] Invalid message`);
							return;
						}

						const res = queue.callback(msg.content.toString(), ch);

						debug(`[${q}] Respond: ${JSON.stringify(res)}`);

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