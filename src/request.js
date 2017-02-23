const debug = require('debug')('tibbar:request');
import Content from './content';
import * as Util from './util';

export default class Request {
	constructor(msg) {
		debug(`.constructor() msg=${JSON.stringify(msg)}`);
		this._msg = msg;
	}

	get message() {
		return this._msg;
	}

	get content() {
		return new Content(this._msg.content);
	}
}