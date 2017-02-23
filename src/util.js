const debug = require('debug')('tibbar:util');
import os from 'os';

export function generateUuid() {
	debug('.generateUuid()');

	const uuid = os.hostname() +
		Math.random().toString() +
		Math.random().toString();

	debug(`    uuid=${uuid}`);

	return uuid;
}


export function prepareBuffer(payload) {
	debug(`.prepareBuffer() payload=${payload}`);

	if (Buffer.isBuffer(payload)) {
		debug('    type=Buffer');
		return payload;
	}

	let buffer = null;

	debug(`    type=${typeof payload}`);

	switch (typeof payload) {
		case 'undefined':
			buffer = Buffer.alloc(0);
			break;

		case 'string':
			buffer = new Buffer(payload);
			break;

		case 'number':
			buffer = Buffer.alloc(8);
			buffer.writeDoubleBE(payload, 0);
			break;

		case 'object':
			buffer = new Buffer(JSON.stringify(payload));
			break;

		// todo: handle other cases
	}

	return buffer;
}