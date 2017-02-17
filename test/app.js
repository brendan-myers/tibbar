const assert = require('assert')
const amqplib = require('amqplib-mocks');
const proxyquire = require('proxyquire');
const tibbar = proxyquire( '../lib/application', { _amqplib: amqplib } );

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
		assert.equal(typeof app._worker.queues['/a'], 'object');
	});

	it('should create and open a queue when connected', function() {
		const app = new tibbar.default();
		app.connect('amqp://localhost').then(function() {
			app.accept('/b');
			assert.equal(typeof app._worker.queues['/b'], 'object');
			app.disconnect();
		});
	});

	it('should create a queue when not connected, and open when connected', function(done) {
		const app = new tibbar.default();
		app.accept('/c');
		app.connect('amqp://localhost').then(function() {
			assert.equal(typeof app._worker.queues['/c'], 'object');
			app.disconnect();
			done();
		});
	});

	it('should call an endpoint, and not expect a response, when using cast', function(done) {
		const app = new tibbar.default();
		app.accept('/d', function(req, res) {
			res.ack();
			app.disconnect();
			done();
		});
		app.connect('amqp://localhost').then(function() {
			app.cast('/d');
		});
	});

	it('should throw an error if cast is called, and not connected', function() {
		const app = new tibbar.default();
		assert.throws(function() { app.cast('/') });
	});

	it('should call an enpoint, and expect a response, when using call', function(done) {
		const app = new tibbar.default();
		app.accept('/e', function(req, res) {
			res.ack().send();
		});
		app.connect('amqp://localhost').then(function() {
			app.call('/e').then(function(res) {
				done();
				app.disconnect();
			});
		});
	});

	it('should throw an error if call is called, and not connected', function() {
		const app = new tibbar.default();
		assert.throws(function() { app.call('/') });
	});

	it('should call an enpoint, and timeout if no response is sent, when using call', function(done) {
		const app = new tibbar.default();
		app.accept('/f');
		app.connect('amqp://localhost').then(function() {
			app.call('/f').then(function(res) {
			}).catch(function(error) {
				done();
				app.disconnect();
			});
		});
	});
});