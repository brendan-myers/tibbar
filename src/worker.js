const debug = require('debug')('tibbar:worker');
import assert from 'assert';
import amqp from 'amqplib';

export default class Worker {
	constructor() {
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
		debug(`Adding queue '${name}'`);

		assert(!this._queues[name], `'${name}'' already exists`);

		this._queues[name] = [];
		this._queues[name].callback = callback;
	}


	connect(url) {
		return amqp.connect(url).then(conn => {
			for (let q in this._queues) {		// todo use Promise.all
				const queue = this._queues[q];

				conn.createChannel().then(ch => {
					ch.assertQueue(q, this._options.assertQueue);
					ch.prefetch(this._options.prefetch);

					const cb = (msg) => {
						debug(`[${q}] Receive: ${JSON.stringify(msg)}`);

						if (!msg.properties.replyTo || !msg.properties.correlationId) { // todo should throw an exception
							debug(`[${q}] Invalid message`);
							return;
						}

						try {
							const res = queue.callback(JSON.parse(msg.content.toString()));

							if ('function' === typeof res.then) {	// if res is a Promise
								res.then(p => {
									debug(`[${q}] Respond: ${JSON.stringify(p)}`);
									sendResponse(p, ch, msg);
								}).catch(ex => {
									debug(`[${q}] Exception: ${JSON.stringify(ex)}`);
									sendResponse(null, ch, msg, ex);
								});
							} else {
								debug(`[${q}] Respond: ${JSON.stringify(res)}`);
								sendResponse(res, ch, msg);
							}
						} catch (ex) {
							debug(`[${q}] Exception: ${JSON.stringify(ex)}`);
							sendResponse(null, ch, msg, ex);
						}
					};

					ch.consume(q, cb);
				});
			}
		});
	}
}

function sendResponse(payload, channel, msg, exception) {
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

	channel.sendToQueue(
		/* channel */ msg.properties.replyTo,
		/* payload */ buffer,
		/* options */ { correlationId: msg.properties.correlationId },
	);

	channel.ack(msg);
};