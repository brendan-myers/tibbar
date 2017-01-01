'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var amqp = require('amqplib');
var assert = require('assert');
var debug = require('debug')('tibbar:client');
var os = require('os');

var Client = function () {
	function Client(url) {
		_classCallCheck(this, Client);

		this._options = {
			assertQueue: {
				exclusive: true,
				durable: true,
				autoDelete: false,
				arguments: null
			},
			hostname: os.hostname(),
			url: url
		};
	}

	_createClass(Client, [{
		key: 'send',
		value: function send(endpoint, params, timeout) {
			var _this = this;

			// todo: implement timeout
			params = !params ? '' : params;
			debug('Calling ' + endpoint + '(' + params + ')');

			var promise = new Promise(function (resolve, reject) {
				var conn = void 0,
				    ch = void 0;

				amqp.connect(_this._options.url).then(function (c) {
					conn = c;
					return conn.createChannel();
				}).then(function (c) {
					ch = c;
					return ch.assertQueue('', { exclusive: true });
				}).then(function (q) {
					var correlationId = _this.generateUuid();

					var cb = function cb(msg) {
						if (msg.properties.correlationId == correlationId) {
							debug('Received ' + msg.content.toString());

							conn.close();

							resolve(msg.content.toString());
						}
					};

					ch.consume(q.queue, cb);

					ch.sendToQueue(endpoint, new Buffer(params), {
						correlationId: correlationId,
						replyTo: q.queue
					});
				});
			});

			return promise;
		}
	}, {
		key: 'generateUuid',
		value: function generateUuid() {
			return this._options.hostname + Math.random().toString() + Math.random().toString();
		}
	}]);

	return Client;
}();

exports.default = Client;