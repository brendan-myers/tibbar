'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _amqplib = require('amqplib');

var _amqplib2 = _interopRequireDefault(_amqplib);

var _request = require('./request');

var _request2 = _interopRequireDefault(_request);

var _response = require('./response');

var _response2 = _interopRequireDefault(_response);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var debug = require('debug')('tibbar:worker');


var defaultOptions = {
	assertQueue: {
		exclusive: false,
		durable: false,
		autoDelete: false,
		arguments: null
	},
	prefetch: 1
};

var Worker = function () {
	function Worker(options) {
		_classCallCheck(this, Worker);

		this._queues = {};
		this._middlewares = [];
		this._options = Object.assign(defaultOptions, options);

		debug('.constructor() options=' + JSON.stringify(options));
		debug('    _options=' + JSON.stringify(this._options));
	}

	_createClass(Worker, [{
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
			});
		}
	}, {
		key: 'accept',
		value: function accept(name, callback) {
			debug('.accept() name=\'' + name + '\', callback=\'' + name + '\'');

			(0, _assert2.default)(!this._queues[name], '\'' + name + '\'\' already exists');

			this._queues[name] = {};
			this._queues[name].callback = callback;

			if (this._ch) {
				return this._openQueue(name);
			}
		}
	}, {
		key: 'use',
		value: function use(middleware) {
			debug('.use() middleware=' + middleware);

			return this._middlewares.push(middleware);
		}
	}, {
		key: '_createChannel',
		value: function _createChannel(connection) {
			var _this3 = this;

			debug('_createChannel()');

			// Yuck, but amqplib-mock doesn't return a promise from createChannel()
			return new Promise(function (resolve, reject) {
				return resolve(connection.createChannel());
			}).then(function (ch) {
				_this3._ch = ch;

				_this3._ch.on('close', function () {
					return debug('event: channel closed');
				});
				_this3._ch.on('error', function (error) {
					return debug('event: channel error:', error);
				});

				var promises = [];

				for (var q in _this3._queues) {
					promises.push(_this3._openQueue(q));
				}

				return Promise.all(promises);
			});
		}
	}, {
		key: '_closeChannel',
		value: function _closeChannel() {
			var _this4 = this;

			debug('_closeChannel()');

			var promises = [];

			for (var q in this._queues) {
				promises.push(this._closeQueue(q));
			}

			return Promise.all(promises).then(function () {
				return _this4._ch.close;
			});
		}
	}, {
		key: '_openQueue',
		value: function _openQueue(q) {
			var _this5 = this;

			debug('._openQueue() q=' + q);

			var queue = this._queues[q];

			this._ch.assertQueue(q, this._options.assertQueue);
			this._ch.prefetch(this._options.prefetch);

			var cb = function cb(msg) {
				if (!msg) {
					return;
				}

				debug('.callback() q=' + q);
				debug('    fields=' + JSON.stringify(msg.fields));
				debug('    properties=' + JSON.stringify(msg.properties));
				debug('    content=' + msg.content.toString());

				var request = new _request2.default(msg);
				var response = new _response2.default(_this5._ch, msg);

				_this5._execCallback(0, request, response, queue.callback);
			};

			return this._ch.consume(q, cb);
		}
	}, {
		key: '_closeQueue',
		value: function _closeQueue(q) {
			debug('._closeQueue() q=' + q);

			var promise = this._ch.deleteQueue(q);
			delete this._queues[q];
			return promise;
		}
	}, {
		key: '_execCallback',
		value: function _execCallback(i, request, response, last) {
			var _this6 = this;

			debug('_execCallback() i=' + i);

			if (i === this._middlewares.length) {
				debug('    executing callback');
				return last(request, response);
			}

			debug('    executing middleware');
			return this._middlewares[i](request, response, function () {
				return new Promise(function (resolve, reject) {
					try {
						resolve(_this6._execCallback(i + 1, request, response, last));
					} catch (error) {
						reject(error);
					}
				});
			});
		}
	}, {
		key: 'connection',
		set: function set(conn) {
			this._conn = conn;
		}
	}]);

	return Worker;
}();

exports.default = Worker;