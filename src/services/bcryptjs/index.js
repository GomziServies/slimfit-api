/**
 * @author Brijesh Prajapati
 * @description Hash String using bcrypt JS
 * @module https://www.npmjs.com/package/bcryptjs
 */

const bcryptjs = require('bcryptjs'),
	logger = require('../winston'),
	{ logging, bcryptjs: option } = require('../../config/default.json');

module.exports.hash = async (string) => {
	if (logging.bcryptjs && option.salt > 10) {
		logger.warn('Recommend to salt less than 10 to make hash faster');
		logger.info('Service [bcryptjs]: Creating Hash');
	}

	return new Promise((resolve, reject) => {
		bcryptjs.genSalt(option.salt, (error, salt) => {
			if (string && !error) {
				bcryptjs.hash(string, salt, (error, hash) => {
					if (hash) {
						if (logging.bcryptjs) {
							logger.info('Service [bcryptjs]: Hash: ' + hash);
						}
						resolve(hash);
					} else {
						logger.error('Service [bcryptjs]: ' + error);
						reject(error);
					}
				});
			} else {
				logger.info('Service [bcryptjs]: String is required to create hash');
				reject(error);
			}
		});
	});
};

/**
 * Compares a string with a hash using bcryptjs.
 *
 * @param {string} string - The string to compare.
 * @param {string} hash - The hash to compare against.
 * @returns {boolean} - Returns true if the string matches the hash, false otherwise.
 */
module.exports.compare = async (string, hash) => {
	const result = await bcryptjs.compare(string, hash);
	if (result) {
		logging.bcryptjs ? logger.info('Service [bcryptjs]: Hash matched ' + true) : null;
		return true;
	} else {
		logging.bcryptjs ? logger.info('Service [bcryptjs]: Hash not matched') : null;
		return false;
	}
};
