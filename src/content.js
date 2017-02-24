const debug = require('debug')('tibbar:content');

/**
 * Helper class to format buffer objects. Used to represent the contents of a request.
 */
export default class Content {
	/**
	 * @param {Buffer} buffer - Buffer instance
	 */
	constructor(buffer) {
		debug(`.constructor() buffer=${buffer}`);
		this._buffer = buffer;
	}


	/**
	 * Formats the buffer as a string.
	 * @return {string} String representation of the buffer/message contents.
	 */
	asString() {
		debug('.asString()');
		debug(`    returning=${this._buffer.toString()}`);
		return this._buffer.toString();
	}


	/**
	 * Formats the buffer as a number.
	 * @return {number} Number representation of the buffer/message contents.
	 */
	asNumber() {
		debug('.asInt()');
		debug(`    returning=${this._buffer.readDoubleBE()}`);
		return this._buffer.readDoubleBE();
	}


	/**
	 * Formats the buffer as an object.
	 * @return {object} JSON object representation of the buffer/message contents.
	 */
	asJSON() {
		debug('.asJSON()');
		debug(`    returning=${JSON.parse(this.asString())}`);
		return JSON.parse(this.asString());
	}
}