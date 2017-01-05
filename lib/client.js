'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _amqplib = require('amqplib');

var _amqplib2 = _interopRequireDefault(_amqplib);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var debug = require('debug')('tibbar:client');

var Client = function () {
	function Client(options) {
		_classCallCheck(this, Client);

		// todo assign option values
		this._options = {
			assertQueue: {
				exclusive: true,
				durable: true,
				autoDelete: false,
				arguments: null
			},
			url: 'amqp://localhost',
			timeout: {
				request: 1000,
				connect: 1000,
				disconnect: 1000,
				disconnectRetry: 250
			}
		};

		this._waiting = {};
	}

	_createClass(Client, [{
		key: 'connect',
		value: function connect(url) {
			var _this = this;

			return _amqplib2.default.connect(url || this._options.url).then(function (conn) {
				_this._conn = conn;
				return _this._conn.createChannel();
			}).then(function (ch) {
				_this._ch = ch;
				return Promise.resolve();
			});
		}
	}, {
		key: 'disconnect',
		value: function disconnect(timeout) {
			debug('Disconnecting');

			if (!this._conn) {
				debug('Not connected');
				throw 'Not connected';
			}

			this._removeAllWaiting();

			this._conn.close().then(function () {
				debug('Disconnected');
			});
		}
	}, {
		key: 'cast',
		value: function cast(endpoint, params, timeout) {
			var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

			params = this._formatParams(params);

			debug('Casting ' + endpoint + '(' + params + ')');

			this._send(endpoint, params, options);
		}
	}, {
		key: 'call',
		value: function call(endpoint, params, timeout) {
			var _this2 = this;

			params = this._formatParams(params);

			var id = _generateUuid();
			this._addToWaiting(id, null);

			return new Promise(function (resolve, reject) {
				debug('Calling ' + endpoint + '(' + params + ')');

				var timer = setTimeout(function () {
					debug('[' + endpoint + '] Timed out', timeout || _this2._options.timeout.request);

					_this2._removeFromWaiting(id);

					reject('Timed out');
				}, timeout || _this2._options.timeout.request);

				return _this2._ch.assertQueue('', _this2._options.assertQueue).then(function (q) {
					_this2._addToWaiting(id, q);

					var cb = function cb(msg) {
						if (msg && msg.properties.correlationId == id) {
							clearTimeout(timer);

							_this2._removeFromWaiting(id);

							var res = JSON.parse(msg.content.toString());

							debug('[' + endpoint + '] Received');
							debug('[' + endpoint + '] fields: ' + JSON.stringify(msg.fields));
							debug('[' + endpoint + '] properties: ' + JSON.stringify(msg.properties));
							debug('[' + endpoint + '] content: ' + msg.content.toString());

							if (res.type == 'exception') {
								reject(res);
							} else {
								resolve(res.body);
							}
						}
					};

					_this2._ch.consume(q.queue, cb);

					_this2._send(endpoint, params, {
						correlationId: id,
						replyTo: q.queue,
						expiration: timeout || _this2._options.timeout.request
					});
				});
			});
		}
	}, {
		key: '_send',
		value: function _send(endpoint, params) {
			var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

			return this._ch.sendToQueue(endpoint, new Buffer(params), options);
		}
	}, {
		key: '_addToWaiting',
		value: function _addToWaiting(id, q) {
			this._waiting[id] = q;
		}
	}, {
		key: '_removeFromWaiting',
		value: function _removeFromWaiting(id) {
			if (this._ch && this._waiting[id] && this._waiting[id].queue) {
				debug('Removing ' + id);
				this._ch.deleteQueue(this._waiting[id].queue).catch(function () {}); // see https://github.com/squaremo/amqp.node/issues/250
			}

			delete this._waiting[id];
		}
	}, {
		key: '_removeAllWaiting',
		value: function _removeAllWaiting() {
			for (var key in Object.keys(this._waiting)) {
				_removeFromWaiting(key);
			}
		}
	}, {
		key: '_formatParams',
		value: function _formatParams(params) {
			return !params ? '{}' : JSON.stringify(params);
		}
	}]);

	return Client;
}();

exports.default = Client;


function _generateUuid() {
	return _os2.default.hostname() + Math.random().toString() + Math.random().toString();
}