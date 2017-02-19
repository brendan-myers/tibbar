'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _amqplib = require('amqplib');

var _amqplib2 = _interopRequireDefault(_amqplib);

var _content = require('./content');

var _content2 = _interopRequireDefault(_content);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _util = require('./util');

var Util = _interopRequireWildcard(_util);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var debug = require('debug')('tibbar:client');


var defaultOptions = {
	consume: {
		exclusive: true,
		durable: true,
		autoDelete: false,
		arguments: null,
		noAck: true,
		consumerTag: 'client'
	},
	timeout: 1000,
	replyTo: 'amq.rabbitmq.reply-to'
};

var Client = function () {
	function Client(options) {
		_classCallCheck(this, Client);

		this._options = Object.assign(defaultOptions, options);
	}

	_createClass(Client, [{
		key: 'connect',
		value: function connect(url) {
			var _this = this;

			debug('Connecting ' + url);

			return _amqplib2.default.connect(url).then(function (conn) {
				_this._conn = conn;

				_this._conn.on('close', function () {
					return debug('Connection closed');
				});
				_this._conn.on('error', function (error) {
					return debug('Connection error:', error);
				});

				return _this._createChannel(_this._conn);
			});
		}
	}, {
		key: 'disconnect',
		value: function disconnect() {
			var _this2 = this;

			debug('Disconnecting');

			if (!this._conn) {
				debug('Disconnecting: Not connected');
				throw 'Disconnecting: Not connected';
			}

			this._closeChannel().then(function () {
				return _this2._conn.close();
			}).then(function () {
				delete _this2._conn;
				debug('Disconnected');
			}).catch(function (error) {
				return debug('Discconect error:', error.message);
			});
		}
	}, {
		key: 'cast',
		value: function cast(endpoint, payload) {
			if (!this._conn) {
				debug('Casting ' + endpoint + ': Not connected');
				throw 'Casting ' + endpoint + ': Not connected';
			}

			debug('Casting ' + endpoint + '(' + payload + ')');

			this._send(endpoint, payload);
		}
	}, {
		key: 'call',
		value: function call(endpoint, payload, timeout) {
			var _this3 = this;

			if (!this._conn) {
				debug('Calling ' + endpoint + ': Not connected');
				throw 'Calling ' + endpoint + ': Not connected';
			}

			var id = Util.generateUuid();

			return new Promise(function (resolve, reject) {
				debug('Calling ' + endpoint + '(' + payload + ')');

				var timer = setTimeout(function () {
					debug('[' + endpoint + '] Timed out', timeout || _this3._options.timeout);
					_this3._ch.emitter.removeAllListeners(id);
					reject('Timed out');
				}, timeout || _this3._options.timeout);

				var cb = function cb(msg) {
					if (msg && msg.properties.correlationId == id) {
						clearTimeout(timer);

						debug('[' + endpoint + '] Received');
						debug('[' + endpoint + '] fields: ' + JSON.stringify(msg.fields));
						debug('[' + endpoint + '] properties: ' + JSON.stringify(msg.properties));
						debug('[' + endpoint + '] content: ' + msg.content.toString());

						var response = new _content2.default(msg.content);

						resolve(response);
					}
				};

				_this3._ch.emitter.once(id, cb);

				_this3._send(endpoint, payload, {
					correlationId: id,
					replyTo: _this3._options.replyTo,
					expiration: timeout || _this3._options.timeout
				});
			});
		}
	}, {
		key: '_createChannel',
		value: function _createChannel(connection) {
			var _this4 = this;

			// Yuck, but amqplib-mock doesn't return a promise from createChannel()
			return new Promise(function (resolve, reject) {
				resolve(connection.createChannel());
			}).then(function (ch) {
				_this4._ch = ch;

				_this4._ch.emitter = new _events2.default();
				_this4._ch.emitter.setMaxListeners(0);
				_this4._ch.consume(_this4._options.replyTo, function (msg) {
					return _this4._ch.emitter.emit(msg.properties.correlationId, msg);
				}, _this4._options.consume);

				_this4._ch.on('close', function () {
					return debug('Channel closed');
				});
				_this4._ch.on('error', function (error) {
					return debug('Channel error:', error);
				});

				return Promise.resolve();
			});
		}
	}, {
		key: '_closeChannel',
		value: function _closeChannel() {
			var _this5 = this;

			return this._ch.cancel(this._options.consume.consumerTag).then(function () {
				return _this5._ch.close();
			});
		}
	}, {
		key: '_send',
		value: function _send(endpoint, payload) {
			var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

			return this._ch.sendToQueue(endpoint, Util.prepareBuffer(payload), options);
		}
	}, {
		key: 'connection',
		set: function set(conn) {
			this._conn = conn;
		}
	}]);

	return Client;
}();

exports.default = Client;