const assert = require('assert')
    , content = require('../lib/content').default
    , request = require('../lib/request').default;

const msg = {
	fields: {},
	properties: {},
	content: Buffer.alloc(0)
};

describe('request', function() {
	it('should be instantiatable', function() {
		const item = new request();
	});

	it('should be instantiatable with argument', function() {
		const item = new request(msg);
		assert.deepEqual(item.message, msg);
	});

	it('should be able to return a content object', function() {
		const item = {
			content: new content(msg.content),
			request: new request(msg)
		};
			
		assert.deepEqual(item.request.content, item.content);
	});
});