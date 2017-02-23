'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.generateUuid = generateUuid;
exports.prepareBuffer = prepareBuffer;

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = require('debug')('tibbar:util');
function generateUuid() {
	debug('.generateUuid()');

	var uuid = _os2.default.hostname() + Math.random().toString() + Math.random().toString();

	debug('    uuid=' + uuid);

	return uuid;
}

function prepareBuffer(payload) {
	debug('.prepareBuffer() payload=' + payload);

	if (Buffer.isBuffer(payload)) {
		debug('    type=Buffer');
		return payload;
	}

	var buffer = null;

	debug('    type=' + (typeof payload === 'undefined' ? 'undefined' : _typeof(payload)));

	switch (typeof payload === 'undefined' ? 'undefined' : _typeof(payload)) {
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