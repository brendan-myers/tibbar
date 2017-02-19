const assert = require('assert')
const amqplib = require('amqplib-mocks');
const proxyquire = require('proxyquire');
const tibbar = proxyquire( '../lib/application', { amqplib: amqplib } );

describe('app', () => {
	it('should be a function', () => {
		const tibbar = require('..');
		assert.equal(typeof tibbar, 'function');
	});

	it('should have a function "connect"', () => {
		const app = new tibbar.default();
		assert.equal(typeof app.connect,  'function');
	});

	it('should throw an error if disconnect is called, and not connected', function() {
		const app = new tibbar.default();
		assert.throws(function() { app.disconnect() });
	});

	it('should create a queue when not connected', function() {
		const app = new tibbar.default();
		app.accept('/a');
		assert.equal(typeof app._worker._queues['/a'], 'object');
	});

	it('should create and open a queue when connected', function(done) {
		const app = new tibbar.default();
		app.connect('app: should create and open a queue when connected').then(() => {
			app.accept('/');
			assert.equal(typeof app._worker._queues['/'], 'object');
			done();
		});
	});

	it('should create a queue when not connected, and open when connected', function(done) {
		const app = new tibbar.default();
		app.accept('/');
		app.connect('app: should create a queue when not connected, and open when connected').then(() => {
			assert.equal(typeof app._worker._queues['/'], 'object');
			done();
		});
	});

	it('should call an endpoint, and not expect a response, when using cast', function(done) {
		const app = new tibbar.default();
		app.accept('/', function(req, res) {
			res.ack();
			done();
		});
		app.connect('app: should call an endpoint, and not expect a response, when using cast').then(function() {
			app.cast('/');
		});
	});

	it('should throw an error if cast is called, and not connected', function() {
		const app = new tibbar.default();
		assert.throws(function() { app.cast('/') });
	});

	it('should call an endpoint, and expect a response, when using call', done => {
		const app = new tibbar.default();
		app.accept('/', (req, res) => {
			res.ack().send();
		});
		app.connect('app: should call an endpoint, and expect a response, when using call').then(() => {
			// --- This is require as amqplib-mocks doesn't support Rabbit's directReplyTo
			app._worker._ch.assertQueue('amq.rabbitmq.reply-to');
			app._client._ch.consume(
				app._client._options.replyTo,
				msg => app._client._ch.emitter.emit(msg.properties.correlationId, msg),
				app._client._options.consume
			);
			// ---

			app.call('/').then(res => {
				done();
			});
		}).catch(error => console.log(error));
	});

	it('should throw an error if call is called, and not connected', () => {
		const app = new tibbar.default();
		assert.throws(() => { app.call('/') });
	});

	it('should call an enpoint, and timeout if no response is sent, when using call', done => {
		const app = new tibbar.default();
		app.accept('/');
		app.connect('app: should call an enpoint, and timeout if no response is sent, when using call').then(() => {
			app.call('/').then(res => {
			}).catch(error => {
				done();
				app.disconnect();
			});
		});
	});
});