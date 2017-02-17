const assert = require('assert')
    , tibbar = require('..');

describe('app', function() {
	it('should be a function', function() {
		assert.equal(typeof tibbar, 'function');
	});

	it('should have a function "connect"', function() {
		const app = tibbar();
		assert.equal(typeof app.connect,  'function');
	});

	it('should throw an error if disconnect is called, and not connected', function() {
		const app = tibbar();
		assert.throws(function() { app.disconnect() });
	});

	it('should create a queue when not connected', function() {
		const app = tibbar();
		app.accept('/a');
		assert.equal(typeof app._worker.queues['/a'], 'object');
	});

	it('should create and open a queue when connected', function() {
		const app = tibbar();
		app.connect('amqp://localhost').then(function() {
			app.accept('/b');
			assert.equal(typeof app._worker.queues['/b'], 'object');
			app.disconnect();
		});
	});

	it('should create a queue when not connected, and open when connected', function() {
		const app = tibbar();
		app.accept('/c');
		app.connect('amqp://localhost').then(function() {
			assert.equal(typeof app._worker.queues['/c'], 'object');
			app.disconnect();
		});
	});

	it('should call an endpoint, and not expect a response, when using cast', function(done) {
		const app = tibbar();
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
		const app = tibbar();
		assert.throws(function() { app.cast('/') });
	});

	it('should call an enpoint, and expect a response, when using call', function(done) {
		const app = tibbar();
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
		const app = tibbar();
		assert.throws(function() { app.call('/') });
	});

	it('should call an enpoint, and timeout if no response is sent, when using call', function(done) {
		const app = tibbar();
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