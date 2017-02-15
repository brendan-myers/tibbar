import os from 'os';

export function generateUuid() {
	return os.hostname() +
		Math.random().toString() +
		Math.random().toString();
}


export function prepareBuffer(payload) {
	if (Buffer.isBuffer(payload)) {
		return payload;
	}

	let buffer = null;

	switch (typeof payload) {
		case 'undefined':
			buffer = Buffer.alloc(0);
			break;

		case 'string':
			buffer = new Buffer(payload);
			break;

		case 'number':
			buffer = Buffer.alloc(4);
			buffer.writeInt32BE(payload, 0);
			break;

		case 'object':
			buffer = new Buffer(JSON.stringify(payload));
			break;

		// todo: handle other cases
	}

	return buffer;
}