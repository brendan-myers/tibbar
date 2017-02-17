const application = require('./lib/application');

exports = module.exports = createApplication;

function createApplication(options) {
	return new application.default(options);
};