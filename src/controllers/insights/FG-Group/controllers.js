const { pickBy } = require('lodash');
const FGGroupFunctions = require('./functions');
const response = require('../../../utils/response');
const httpStatus = require('http-status');
const { getLoggerInstance } = require('../../../utils');
const LoggerPrefix = 'Controllers > Insights > FG Group > Controllers';

module.exports.getOrderInsightsController = function (req, res) {
	const logger = getLoggerInstance(req);

	logger.info(LoggerPrefix, '(getOrderInsightsController)');

	const params = pickBy(req.query);

	FGGroupFunctions.getOrderStats(params, logger)
		.then((result) => {
			return response(res, httpStatus.OK, 'success', result.data, undefined, result.metadata);
		})
		.catch((error) => response(res, error));
};

module.exports.getInvoiceInsightsController = function (req, res) {
	const logger = getLoggerInstance(req);

	logger.info(LoggerPrefix, '(getInvoiceStatsController)');

	const params = pickBy(req.query);

	FGGroupFunctions.getInvoiceStats(params, logger)
		.then((result) => {
			return response(res, httpStatus.OK, 'success', result.data, undefined, result.metadata);
		})
		.catch((error) => response(res, error));
};

module.exports.getUsersStatsController = function (req, res) {
	const logger = getLoggerInstance(req);

	logger.info(LoggerPrefix, '(getUsersStatsController)');

	const params = pickBy(req.query, (v) => v !== '');

	FGGroupFunctions.getUsersStats(params, logger)
		.then((result) => {
			return response(res, httpStatus.OK, 'success', result.data, undefined, result.metadata);
		})
		.catch((error) => response(res, error));
};

module.exports.getStudentStatsController = function (req, res) {
	const logger = getLoggerInstance(req);

	logger.info(LoggerPrefix, '(getStudentStatsController)');

	const params = pickBy(req.query, (v) => v !== '');

	FGGroupFunctions.getStudentsStats(params, logger)
		.then((result) => {
			return response(res, httpStatus.OK, 'success', result.data, undefined, result.metadata);
		})
		.catch((error) => response(res, error));
};

module.exports.getExpenseInsightsController = function (req, res) {
	const logger = getLoggerInstance(req);

	logger.info(LoggerPrefix, '(getExpenseInsightsController)');

	const params = pickBy(req.query);

	FGGroupFunctions.getExpenseStats(params, logger)
		.then((result) => {
			return response(res, httpStatus.OK, 'success', result.data, undefined, result.metadata);
		})
		.catch((error) => response(res, error));
};
