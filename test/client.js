const assert = require('assert')
const amqplib = require('amqplib-mocks');
const proxyquire = require('proxyquire');
const client = proxyquire( '../lib/client', { amqplib: amqplib } );
const worker = proxyquire( '../lib/worker', { amqplib: amqplib } );

describe('client', () => {
	it('should have a function "connect"', () => {
		const app = new client.default();
		assert.equal(typeof app.connect,  'function');
	});

	it('should throw an error if disconnect is called, and not connected', function() {
		const app = new client.default();
		assert.throws(function() { app.disconnect() });
	});

	it('should call an endpoint, and not expect a response, when using cast', function(done) {
		const app = new client.default();
		app.connect('client: should call an endpoint, and not expect a response, when using cast').then(function() {
			app.cast('/');
			done();
		});
	});

	it('should throw an error if cast is called, and not connected', function() {
		const app = new client.default();
		assert.throws(function() { app.cast('/') });
	});

	it('should call an endpoint, and expect a response, when using call', done => {
		const app = new client.default();

		app.connect('client: should call an endpoint, and expect a response, when using call').then(() => {
			const app_worker = new worker.default();
			app_worker.accept('/', (req, res) => {
				res.ack().send();
			});

			// --- Need to ref the same connection
			app_worker.connection = app._conn;
			app_worker._createChannel(app._conn).then(() => {
				// --- This is require as amqplib-mocks doesn't support Rabbit's directReplyTo
				app_worker._ch.assertQueue('amq.rabbitmq.reply-to');
				app._ch.consume(
					app._options.replyTo,
					msg => app._ch.emitter.emit(msg.properties.correlationId, msg),
					app._options.consume
				);
				// ---
				app.call('/').then(res => {
					done();
				});
			})
		});
	});

	it('should throw an error if call is called, and not connected', () => {
		const app = new client.default();
		assert.throws(() => { app.call('/') });
	});

	it('should call an enpoint, and timeout if no response is sent, when using call', done => {
		const app = new client.default();

		app.connect('client: should call an enpoint, and timeout if no response is sent, when using call').then(() => {
			app.call('/').then(res => {
			}).catch(error => {
				done();
				app.disconnect();
			});
		});
	});

	it('should disconnect nicely', function(done) {
		const app = new client.default();
		app.connect('client: should disconnect nicely').then(() => {
			app.cast('/');
			// --- This is require as amqplib-mocks is missing channel.deleteQueue
			app._ch.cancel = () => new Promise((resolve, reject) => { resolve(); });
			app.disconnect();
			done();
		}).catch(error => console.log(error));
	});

	it('should error if disconnect called when not connected', function() {
		const app = new client.default();
		assert.throws(() => { app.disconnect() });
	});
});