export default class Content {
	constructor(buffer) {
		this._buffer = buffer;
	}

	asString() {
		return this._buffer.toString();
	}

	asInt() {
		return this._buffer.readInt32BE();
	}

	asJSON() {
		return JSON.parse(this.asString());
	}
}