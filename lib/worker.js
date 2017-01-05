'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _amqplib = require('amqplib');

var _amqplib2 = _interopRequireDefault(_amqplib);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var debug = require('debug')('tibbar:worker');

var Worker = function () {
	function Worker(options) {
		_classCallCheck(this, Worker);

		// todo assign option values
		this._queues = {};
		this._options = {
			assertQueue: {
				exclusive: false,
				durable: false,
				autoDelete: false,
				arguments: null
			},
			prefetch: 1
		};
	}

	_createClass(Worker, [{
		key: 'use',
		value: function use(name, callback) {
			(0, _assert2.default)(!this._queues[name], '\'' + name + '\'\' already exists');

			debug('Adding queue \'' + name + '\'');

			this._queues[name] = [];
			this._queues[name].callback = callback;

			if (this._ch) {
				this._openQueue(name);
			}
		}
	}, {
		key: 'disconnect',
		value: function disconnect() {
			if (this._conn) {
				this._conn.close();
				delete this._conn;
			}
		}
	}, {
		key: 'connect',
		value: function connect(url) {
			var _this = this;

			debug('Connecting ' + url);

			return _amqplib2.default.connect(url).then(function (conn) {
				_this._conn = conn;
				return conn.createChannel();
			}).then(function (ch) {
				_this._ch = ch;

				var promises = [];

				for (var q in _this._queues) {
					promises.push(_this._openQueue(q));
				}

				return Promise.all(promises);
			});
		}
	}, {
		key: '_openQueue',
		value: function _openQueue(q) {
			var _this2 = this;

			debug('[' + q + '] Opening');

			var queue = this._queues[q];

			this._ch.assertQueue(q, this._options.assertQueue);
			this._ch.prefetch(this._options.prefetch);

			var cb = function cb(msg) {
				debug('[' + q + '] Receive: ' + JSON.stringify(msg));

				try {
					var res = queue.callback(JSON.parse(msg.content.toString()));

					if (!msg.properties.replyTo || !msg.properties.correlationId) {
						debug('[' + q + '] No response');
						_this2._ch.ack(msg);
					} else if ('function' === typeof res.then) {
						// if res is a Promise
						res.then(function (p) {
							debug('[' + q + '] Respond: ' + JSON.stringify(p));
							_this2._sendResponse(p, msg);
						}).catch(function (ex) {
							debug('[' + q + '] Exception: ' + JSON.stringify(ex));
							_this2._sendResponse(null, msg, ex);
						});
					} else {
						debug('[' + q + '] Respond: ' + JSON.stringify(res));
						_this2._sendResponse(res, msg);
					}
				} catch (ex) {
					debug('[' + q + '] Exception: ' + JSON.stringify(ex));
					_this2._sendResponse(null, msg, ex);
				}
			};

			return this._ch.consume(q, cb);
		}
	}, {
		key: '_closeQueue',
		value: function _closeQueue(q) {
			debug('[' + q + '] Closing');

			this._ch.deleteQueue(q);
			delete this._queues[q];
		}
	}, {
		key: '_sendResponse',
		value: function _sendResponse(payload, msg, exception) {
			if (!msg) {
				return;
			}

			var buffer = void 0;

			if (!exception) {
				buffer = new Buffer(JSON.stringify({
					type: 'response',
					body: payload
				}));
			} else {
				buffer = new Buffer(JSON.stringify({
					type: 'exception',
					name: exception.constructor.name,
					body: exception
				}));
			}

			this._ch.sendToQueue(
			/* queue   */msg.properties.replyTo,
			/* payload */buffer,
			/* options */{ correlationId: msg.properties.correlationId });

			this._ch.ack(msg);
		}
	}]);

	return Worker;
}();

exports.default = Worker;