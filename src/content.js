const debug = require('debug')('tibbar:content');

export default class Content {
	constructor(buffer) {
		debug(`.constructor() buffer=${buffer}`);
		this._buffer = buffer;
	}

	asString() {
		debug('.asString()');
		debug(`    returning=${this._buffer.toString()}`);
		return this._buffer.toString();
	}

	asInt() {
		debug('.asInt()');
		debug(`    returning=${this._buffer.readDoubleBE()}`);
		return this._buffer.readDoubleBE();
	}

	asJSON() {
		debug('.asJSON()');
		debug(`    returning=${JSON.asString(this.asString())}`);
		return JSON.parse(this.asString());
	}
}