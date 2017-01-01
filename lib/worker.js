'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var amqp = require('amqplib');
var assert = require('assert');
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

			assert(!this._queues[name], '\'' + name + '\'\' already exists');

			this._queues[name] = [];
			this._queues[name].callback = callback;
		}
	}, {
		key: 'connect',
		value: function connect(url) {
			var _this = this;

			return amqp.connect(url).then(function (conn) {
				var _loop = function _loop(q) {
					var queue = _this._queues[q];

					conn.createChannel().then(function (ch) {
						ch.assertQueue(q, _this._options.assertQueue);
						ch.prefetch(_this._options.prefetch);

						var cb = function cb(msg) {
							debug('[' + q + '] Receive: ' + JSON.stringify(msg));

							if (!msg.properties.replyTo | !msg.properties.correlationId) {
								debug('[' + q + '] Invalid message');
								return;
							}

							var res = queue.callback(msg.content.toString(), ch);

							debug('[' + q + '] Respond: ' + JSON.stringify(res));

							ch.sendToQueue(msg.properties.replyTo, new Buffer(res), { correlationId: msg.properties.correlationId });

							ch.ack(msg);
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