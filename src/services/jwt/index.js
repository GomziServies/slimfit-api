/**
 * @author Brijesh Prajapati
 * @description Create Bearer Token for Object
 * @module https://www.npmjs.com/package/jsonwebtoken
 */

const jwt = require('jsonwebtoken'),
	logger = require('../winston'),
	{ logging } = require('../../config/default.json');
const process = require('process');

/**
 *
 * @param {*} object
 * @param {*} expiredIn
 * @param {jwt.SignOptions} otherOption
 * @returns
 */
module.exports.sign = (object, expiredIn, otherOption = {}) => {
	try {
		const token = object ? jwt.sign(object, process.env.JWT_SECRET, { expiresIn: expiredIn || '1000d', ...otherOption }) : undefined;

		if (!token) {
			logger.error('Service [JWT]: String/Object Required to create Sign Token');
			return false;
		}

		logging.jwt ? logger.info('Service [JWT]: Object Signed') : null;

		return token;
	} catch (error) {
		// logger.error('Service [JWT]: ' + error)
		return null;
	}
};

/**
 *
 * @param {*} token
 * @param {jwt.VerifyOptions} verifyOptions
 * @returns
 */
module.exports.verify = (token, verifyOptions) => {
	try {
		const verify = jwt.verify(token, process.env.JWT_SECRET, verifyOptions);
		// logger.info((token, verify) ? 'Token Verified Successfully' : 'Token Verification Failed/Expired')
		return token ? verify : false;
	} catch (error) {
		// logger.error('Service [JWT]: ' + error)
		return false;
	}
};
