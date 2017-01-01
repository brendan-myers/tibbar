const amqp = require('amqplib');
const assert = require('assert');
const debug = require('debug')('tibbar:client');
const os = require('os');

export default class Client {
	constructor(url) {
		this._options = {
			assertQueue: {
				exclusive: true,
				durable: true,
				autoDelete: false,
				arguments: null
			},
			hostname: os.hostname(),
			url,
		}
	}


  send(endpoint, params, timeout) {  // todo: implement timeout
  	params = !params ? '' : params;
  	debug(`Calling ${endpoint}(${params})`);
  	
  	const promise = new Promise((resolve, reject) => {
  		let conn, ch;

	  	amqp.connect(this._options.url).then(c => {
	  		conn = c;
	  		return conn.createChannel();
	  	}).then(c => {
	  		ch = c;
				return ch.assertQueue('', { exclusive: true });
			}).then((q) => {
				const correlationId = this.generateUuid();

				const cb = (msg) => {
					if (msg.properties.correlationId == correlationId) {
						debug(`Received ${msg.content.toString()}`);

						conn.close();

						resolve(msg.content.toString());
					}
				};

				ch.consume(q.queue, cb);

				ch.sendToQueue(
					endpoint,
					new Buffer(params),
					{
						correlationId: correlationId,
						replyTo: q.queue
					}
				);
			});
		});

		return promise;
  }


	generateUuid() {
	  return this._options.hostname +
	         Math.random().toString() +
	         Math.random().toString();
	}
}