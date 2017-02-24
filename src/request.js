const debug = require('debug')('tibbar:request');
import Content from './content';
import * as Util from './util';

/**
 * Represents a request from RabbitMQ.
 */
export default class Request {
	/**
	 * @param {object} msg - Message instance as received from a RabbitMQ server.
	 */
	constructor(msg) {
		debug(`.constructor() msg=${JSON.stringify(msg)}`);
		this._msg = msg;
	}

	/**
	 * @return {object} The message as received from RabbitMQ.
	 */
	get message() {
		return this._msg;
	}

	/**
	 * @return {Content} The message formatted as a content instance.
	 */
	get content() {
		return new Content(this._msg.content);
	}
}