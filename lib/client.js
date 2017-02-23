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

		debug('.constructor() options=' + JSON.stringify(options));
		debug('    _options=' + JSON.stringify(this._options));
	}

	_createClass(Client, [{
		key: 'connect',
		value: function connect(url) {
			var _this = this;

			debug('.connect() url=' + url);

			return _amqplib2.default.connect(url).then(function (conn) {
				_this._conn = conn;

				_this._conn.on('close', function () {
					return debug('event: connection closed');
				});
				_this._conn.on('error', function (error) {
					return debug('event: connection error:', error);
				});

				return _this._createChannel(_this._conn);
			});
		}
	}, {
		key: 'disconnect',
		value: function disconnect() {
			var _this2 = this;

			debug('.disconnect()');

			if (!this._conn) {
				debug('    error: Not connected');
				throw 'Disconnecting: Not connected';
			}

			this._closeChannel().then(function () {
				return _this2._conn.close();
			}).then(function () {
				delete _this2._conn;
				debug('    success: disconnected');
			}).catch(function (error) {
				debug('    error: ' + error.message);
			});
		}
	}, {
		key: 'cast',
		value: function cast(route, payload, options) {
			debug('.cast() route=' + route + ' payload=' + JSON.stringify(payload) + ' options=' + options);

			if (!this._conn) {
				debug('    error: Not connected');
				throw 'Casting ' + route + ': Not connected';
			}

			this._send(route, payload, options);
		}
	}, {
		key: 'call',
		value: function call(route, payload, timeout) {
			var _this3 = this;

			debug('.call() route=' + route + ' payload=' + JSON.stringify(payload) + ' timeout=' + timeout);

			if (!this._conn) {
				debug('    error: Not connected');
				throw 'Calling ' + route + ': Not connected';
			}

			var id = Util.generateUuid();

			return new Promise(function (resolve, reject) {
				var timer = setTimeout(function () {
					debug('error: call to ' + route + ' timed out', timeout || _this3._options.timeout);
					_this3._ch.emitter.removeAllListeners(id);
					reject('error: call to ' + route + ' timed out');
				}, timeout || _this3._options.timeout);

				var cb = function cb(msg) {
					if (msg && msg.properties.correlationId == id) {
						clearTimeout(timer);

						debug('.callback() route=' + route);
						debug('    fields=' + JSON.stringify(msg.fields));
						debug('    properties=' + JSON.stringify(msg.properties));
						debug('    content=' + msg.content.toString());

						var response = new _content2.default(msg.content);

						resolve(response);
					}
				};

				_this3._ch.emitter.once(id, cb);

				_this3._send(route, payload, {
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

			debug('._createChannel()');

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
					return debug('event: channel closed');
				});
				_this4._ch.on('error', function (error) {
					return debug('event: channel error:', error);
				});

				return Promise.resolve();
			});
		}
	}, {
		key: '_closeChannel',
		value: function _closeChannel() {
			var _this5 = this;

			debug('._closeChannel()');
			debug('    tag=' + this._options.consume.consumerTag);

			return this._ch.cancel(this._options.consume.consumerTag).then(function () {
				return _this5._ch.close();
			});
		}
	}, {
		key: '_send',
		value: function _send(route, payload) {
			var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

			debug('._send() route=' + route + ' payload=' + JSON.stringify(payload) + ' options=' + options);

			return this._ch.sendToQueue(route, Util.prepareBuffer(payload), options);
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