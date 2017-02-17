const assert = require('assert')
    , content = require('../lib/content').default
    , util = require('../lib/util');

describe('content', function() {
	it('should be instantiatable', function() {
		const item = new content();
	});

	it('should be instantiatable with argument', function() {
		const buffer = Buffer.alloc(0);
		const item = new content(buffer);
		assert.deepEqual(item._buffer, Buffer.alloc(0));
	});

	it('should be able to return a string', function() {
		const value = 'hello, world';
		const item = new content(value);
		assert.equal(item.asString(), value);
		assert.equal(typeof item.asString(), 'string');
	});

	it('should be able to return a number', function() {
		const value = 42;
		const buffer = util.prepareBuffer(value);
		const item = new content(buffer);
		assert.equal(item.asInt(), value);
		assert.equal(typeof item.asInt(), 'number');
	});

	it('should be able to return a JSON object', function() {
		const value = { hello: 'world' };
		const buffer = util.prepareBuffer(value);
		const item = new content(buffer);
		assert.deepEqual(item.asJSON(), value);
		assert.equal(typeof item.asJSON(), 'object');
	});
});