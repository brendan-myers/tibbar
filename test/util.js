const assert = require('assert')
    , util = require('../lib/util');

describe('util', function() {
	it('should have a function to generate uuids', function() {
		const id = util.generateUuid();

		assert.equal(typeof id, 'string');
	});

	it('should generate randoms uuids', function() {
		const id1 = util.generateUuid();
		const id2 = util.generateUuid();

		assert.notEqual(id1, id2);
	});

	it('should return the same buffer when prepareBuffer is passed a buffer', function() {
		const buffer1 = Buffer.alloc(0);
		const buffer2 = util.prepareBuffer(buffer1);
		assert.equal(buffer1, buffer2);
	});

	it('should return an empty buffer when prepareBuffer is passed nothing', function() {
		const buffer1 = Buffer.alloc(0);
		const buffer2 = util.prepareBuffer();
		assert.deepEqual(buffer1, buffer2);
	});

	it('should return a buffer when prepareBuffer is passed a string', function() {
		const value = 'hello, world';
		const buffer = util.prepareBuffer(value);
		assert.deepEqual(buffer, new Buffer(value));
		assert.equal(buffer.toString(), value);
	});

	it('should return a buffer when prepareBuffer is passed a number', function() {
		const value = 42;
		const buffer1 = util.prepareBuffer(value);
		const buffer2 = Buffer.alloc(8);
		buffer2.writeDoubleBE(value, 0);
		assert.deepEqual(buffer1, buffer2);
		assert.equal(buffer1.readDoubleBE(), value);
	});

	it('should return a buffer when prepareBuffer is passed an object', function() {
		const value = { hello: 'world' };
		const buffer1 = util.prepareBuffer(value);
		const buffer2 = new Buffer(JSON.stringify(value));
		assert.deepEqual(buffer1, buffer2);
		assert.deepEqual(JSON.parse(buffer1.toString()), value);
	});
});