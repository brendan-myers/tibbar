const debug = require('debug')('tibbar:response');
import * as Util from './util';

export default class Response {
	constructor(channel, msg) {
		debug(`.constructor() msg=${JSON.stringify(msg)}`);

		this._ch = channel;
		this._msg = msg;
	}

	ack() {
		debug('.ack()');
		debug(`    msg=${JSON.stringify(this._msg)}`);
		this._ch.ack(this._msg);

		return this;
	}

	send(payload) {
		debug(`.send() payload=${payload}`);
		debug(`    queue=${this._msg.properties.replyTo}`);
		debug(`    payload=${JSON.stringify(Util.prepareBuffer(payload))}`);
		debug(`    options={ correlationId: ${this._msg.properties.correlationId} }`);

		this._ch.sendToQueue(
			/* queue   */ this._msg.properties.replyTo,
			/* payload */ Util.prepareBuffer(payload),
			/* options */ { correlationId: this._msg.properties.correlationId },
		);

		return this;
	}
}