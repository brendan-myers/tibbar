import Content from './content';
import * as Util from './util';

export default class Request {
	constructor(msg) {
		this._msg = msg;
	}

	get message() {
		return this._msg;
	}

	get content() {
		return new Content(this._msg.content);
	}
}