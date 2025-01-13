const express = require('express'),
	app = express(),
	httpStatus = require('http-status'),
	logger = require('./src/services/winston'),
	packageInfo = require('./package.json'),
	response = require('./src/utils/response'),
	cors = require('cors'),
	{ randomDigit } = require('./src/utils/random');
const hideSensitiveValue = require('./src/utils/hide-sensitive-value');
const AppConfig = require('./src/config/default.json');
const { DayJS } = require('./src/services');
const serverUpTime = new Date();
const process = require('process');
const Buffer = require('buffer').Buffer;

// CORS
app.use(cors());

// Body Parser
app.use(express.urlencoded({ extended: true }), express.json(), (error, req, res, next) => {
	if (error instanceof SyntaxError) {
		return res.status(httpStatus.BAD_REQUEST).json({ message: 'SyntaxError: Invalid Body' });
	}
	if (error instanceof ReferenceError) {
		return res.status(httpStatus.BAD_REQUEST).json({ message: 'ReferenceError: Invalid Reference. [REPORT TO DEVELOPER]' });
	}

	next();
});

// Set Request ID and Time
app.use((req, res, next) => {
	// Attach Logger to Request and Response Object
	const time = new Date(),
		requestId = `REQ-${randomDigit()}`;

	const reqLogger = logger.__instance({ defaultMeta: { requestId: requestId, requestTime: time } });

	req.requestId = res.requestId = requestId;
	req.requestTime = res.requestTime = new Date();
	req.logger = res.logger = reqLogger;
	next();
});

app.use((req, res, next) => {
	// URI Error Handling
	try {
		decodeURIComponent(req.path);
	} catch (error) {
		return response(res, httpStatus.BAD_REQUEST, 'URIError: Invalid URI/ URL. URI/ URL may contain invalid character.' + error.message || '', error);
	}

	try {
		var headers = hideSensitiveValue(req.headers),
			body = req.body ? hideSensitiveValue(req.body) : {},
			query = hideSensitiveValue(req.query);

		if (req.body instanceof Buffer) {
			body = '<Buffer>';
		}

		// Log Incoming Request
		if (AppConfig.ignoreLogPaths.includes(req.path) || AppConfig.healthCheckPaths.includes(req.path)) {
			req.logger.silent = true;
			res.logger.silent = true;
		} else {
			req.logger.silent = res.logger.silent = false;
		}

		const headerLog = `Headers: ${JSON.stringify(headers)}`;
		const queryLog = Object.keys(req.query).length > 0 ? `\nQuery: ${JSON.stringify(query)}` : '';
		let bodyLog = req.body ? `\nBody: ${JSON.stringify(body)}` : '';

		if (bodyLog.length > 2000) bodyLog = `\nBody: Body too long to log. [${bodyLog.length} characters]`;

		req.logger.info(`REQUEST
IP: ${(headers['x-forwarded-for'] || req.socket.remoteAddress).split(',')[0]} | Path: ${req.path} | Method: ${req.method}
${headerLog} ${queryLog} ${bodyLog}
==============================================================`);

		next();
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Request Logger Error', error);
	}
});

// Cookie Parser
app.use(require('cookie-parser')());

// Initialize Services
require('./src/services');

// App Health Check
app.get(['/', '/health'], (req, res) => {
	return response(res, httpStatus.OK, 'Health: OK', {
		app: packageInfo.name,
		version: packageInfo.version,
		environment: process.env.NODE_ENV,
		author: packageInfo.author,
		contributors: packageInfo.contributors,
		time_info: {
			timezone: DayJS.tz.guess(),
			server_uptime: {
				Date: serverUpTime,
				locale_string: DayJS(serverUpTime).format('LLLL'),
				uptime_info: DayJS(serverUpTime).fromNow(),
				uptime_seconds: parseInt((new Date() - serverUpTime) / 1000),
			},
			server_time: { Date: new Date(), locale_string: DayJS().format('LLLL') },
		},
	});
});

// Routes
const { adminRoutes } = require('./src/routes');
const { common_environment } = require('./src/common');

app.use('/admin/v1', adminRoutes);

process.env.NODE_ENV === common_environment.development;

app.use((req, res) => {
	return response(res, httpStatus.NOT_FOUND, 'The request route does not exist or the method might be different.', { path: req.originalUrl, method: req.method });
});

module.exports = app;
