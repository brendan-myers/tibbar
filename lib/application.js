'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _amqplib = require('amqplib');

var _amqplib2 = _interopRequireDefault(_amqplib);

var _client = require('./client');

var _client2 = _interopRequireDefault(_client);

var _worker = require('./worker');

var _worker2 = _interopRequireDefault(_worker);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var debug = require('debug')('tibbar:application');

var Application = function () {
	function Application(options) {
		_classCallCheck(this, Application);

		this._client = new _client2.default(options ? options.client : null);
		this._worker = new _worker2.default(options ? options.worker : null);
	}

	_createClass(Application, [{
		key: 'connect',
		value: function connect(url) {
			var _this = this;

			debug('Connecting ' + url);

			return _amqplib2.default.connect(url).then(function (conn) {
				_this._conn = conn;
				_this._worker.connection = conn;
				_this._client.connection = conn;

				var promises = [];

				promises.push(_this._worker._createChannel(conn));
				promises.push(_this._client._createChannel(conn));

				return Promise.all(promises);
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

			var promises = [];

			promises.push(this._worker._closeChannel());
			promises.push(this._client._closeChannel());

			return Promise.all(promises).then(function () {
				return _this2._conn.close();
			}).then(function () {
				delete _this2._conn;
				debug('Disconnected');
			});
		}
	}, {
		key: 'accept',
		value: function accept(name, callback) {
			return this._worker.accept(name, callback);
		}
	}, {
		key: 'use',
		value: function use(middleware) {
			return this._worker.use(middleware);
		}
	}, {
		key: 'cast',
		value: function cast(endpoint, payload) {
			return this._client.cast(endpoint, payload);
		}
	}, {
		key: 'call',
		value: function call(endpoint, payload, timeout) {
			return this._client.call(endpoint, payload, timeout);
		}
	}, {
		key: 'worker',
		get: function get() {
			return this._worker;
		}
	}, {
		key: 'client',
		get: function get() {
			return this._client;
		}
	}]);

	return Application;
}();

exports.default = Application;