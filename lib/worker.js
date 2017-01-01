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
	function Worker() {
		_classCallCheck(this, Worker);

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
			debug('Adding queue \'' + name + '\'');

			(0, _assert2.default)(!this._queues[name], '\'' + name + '\'\' already exists');

			this._queues[name] = [];
			this._queues[name].callback = callback;
		}
	}, {
		key: 'connect',
		value: function connect(url) {
			var _this = this;

			return _amqplib2.default.connect(url).then(function (conn) {
				var _loop = function _loop(q) {
					// todo use Promise.all
					var queue = _this._queues[q];

					conn.createChannel().then(function (ch) {
						ch.assertQueue(q, _this._options.assertQueue);
						ch.prefetch(_this._options.prefetch);

						var cb = function cb(msg) {
							debug('[' + q + '] Receive: ' + JSON.stringify(msg));

							if (!msg.properties.replyTo || !msg.properties.correlationId) {
								// todo should throw an exception
								debug('[' + q + '] Invalid message');
								return;
							}

							try {
								var res = queue.callback(JSON.parse(msg.content.toString()));

								if ('function' === typeof res.then) {
									// if res is a Promise
									res.then(function (p) {
										debug('[' + q + '] Respond: ' + JSON.stringify(p));
										sendResponse(p, ch, msg);
									}).catch(function (ex) {
										debug('[' + q + '] Exception: ' + JSON.stringify(ex));
										sendResponse(null, ch, msg, ex);
									});
								} else {
									debug('[' + q + '] Respond: ' + JSON.stringify(res));
									sendResponse(res, ch, msg);
								}
							} catch (ex) {
								debug('[' + q + '] Exception: ' + JSON.stringify(ex));
								sendResponse(null, ch, msg, ex);
							}
						};

						ch.consume(q, cb);
					});
				};

				for (var q in _this._queues) {
					_loop(q);
				}
			});
		}
	}]);

	return Worker;
}();

exports.default = Worker;


function sendResponse(payload, channel, msg, exception) {
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

	channel.sendToQueue(
	/* channel */msg.properties.replyTo,
	/* payload */buffer,
	/* options */{ correlationId: msg.properties.correlationId });

	channel.ack(msg);
};