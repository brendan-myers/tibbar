import * as Util from './util';

export default class Response {
	constructor(channel, msg) {
		this._ch = channel;
		this._msg = msg;
	}

	ack() {
		this._ch.ack(this._msg);
	}

	send(payload) {
		this._ch.sendToQueue(
			/* queue   */ this._msg.properties.replyTo,
			/* payload */ Util.prepareBuffer(payload),
			/* options */ { correlationId: this._msg.properties.correlationId },
		);

		return this;
	}
}