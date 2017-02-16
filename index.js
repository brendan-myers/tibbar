/*
const worker = require('./lib/worker.js');

exports.worker = function(options) {
	return new worker.default(options);
}

const client = require('./lib/client.js');

exports.client = function(options) {
	return new client.default(options);
}*/
/*!
 * tibbar
 * Copyright(c) 2016 Brendan Myers
 * MIT Licensed
 */

//'use strict';

const application = require('./lib/application');

exports = module.exports = createApplication;

function createApplication(options) {
	return new application.default(options);
};