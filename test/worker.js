const assert = require('assert')
const amqplib = require('amqplib-mocks');
const proxyquire = require('proxyquire');
const worker = proxyquire( '../lib/worker', { amqplib: amqplib } );

describe('worker', () => {
	it('should have a function "connect"', () => {
		const app = new worker.default();
		assert.equal(typeof app.connect,  'function');
	});

	it('should throw an error if disconnect is called, and not connected', function() {
		const app = new worker.default();
		assert.throws(function() { app.disconnect() });
	});

	it('should create a queue when not connected', function() {
		const app = new worker.default();
		app.accept('/a');
		assert.equal(typeof app._queues['/a'], 'object');
	});

	it('should create and open a queue when connected', function(done) {
		const app = new worker.default();
		app.connect('worker: should create and open a queue when connected').then(() => {
			app.accept('/');
			assert.equal(typeof app._queues['/'], 'object');
			done();
		});
	});

	it('should create a queue when not connected, and open when connected', function(done) {
		const app = new worker.default();
		app.accept('/');
		app.connect('worker: should create a queue when not connected, and open when connected').then(() => {
			assert.equal(typeof app._queues['/'], 'object');
			done();
		});
	});

	it('should disconnect nicely', function(done) {
		const app = new worker.default();
		app.accept('/');
		app.connect('worker: should disconnect nicely').then(() => {
			// --- This is require as amqplib-mocks is missing channel.deleteQueue
			app._ch.deleteQueue = () => {};
			app.disconnect();
			done();
		}).catch(error => console.log(error));
	});

	it('should error if disconnect called when not connected', function() {
		const app = new worker.default();
		assert.throws(() => { app.disconnect() });
	});
});