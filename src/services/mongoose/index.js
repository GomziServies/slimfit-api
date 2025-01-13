/**
 * @author Brijesh Prajapati
 * @description Export Mongoose Schema Module with Configuration and MongoDB Connection
 * @module https://www.npmjs.com/package/mongoose
 * @tutorial https://mongoosejs.com/docs/guide.html
 */

const mongoose = require('mongoose'),
	logger = require('../winston');
const process = require('process');

if (!process.env.MongoDB_URI) {
	logger.error('Secrets [Mongoose]: srv not found');
}

try {
	mongoose
		.connect(process.env.MongoDB_URI)
		.then((c) => {
			logger.info('Service [Mongoose]: Connected ' + `[${c?.connection?.db?.databaseName || '##DB_CONNECTION_FAILED##'}]`);
		})
		.catch((error) => {
			logger.error('Service [Mongoose]: ', error);
		});
} catch (error) {
	logger.error('Service [Mongoose]: ' + error);
}
