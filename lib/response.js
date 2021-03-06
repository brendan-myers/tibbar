'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _util = require('./util');

var Util = _interopRequireWildcard(_util);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var debug = require('debug')('tibbar:response');

var Response = function () {
	function Response(channel, msg) {
		_classCallCheck(this, Response);

		debug('.constructor() msg=' + JSON.stringify(msg));

		this._ch = channel;
		this._msg = msg;
	}

	_createClass(Response, [{
		key: 'ack',
		value: function ack() {
			debug('.ack()');
			debug('    msg=' + JSON.stringify(this._msg));
			this._ch.ack(this._msg);

			return this;
		}
	}, {
		key: 'send',
		value: function send(payload) {
			debug('.send() payload=' + payload);
			debug('    queue=' + this._msg.properties.replyTo);
			debug('    payload=' + JSON.stringify(Util.prepareBuffer(payload)));
			debug('    options={ correlationId: ' + this._msg.properties.correlationId + ' }');

			this._ch.sendToQueue(
			/* queue   */this._msg.properties.replyTo,
			/* payload */Util.prepareBuffer(payload),
			/* options */{ correlationId: this._msg.properties.correlationId });

			return this;
		}
	}]);

	return Response;
}();

exports.default = Response;