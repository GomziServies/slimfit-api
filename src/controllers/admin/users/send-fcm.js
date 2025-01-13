/**
 * @author Brijesh Prajapati
 * @description Send Push Notification to User
 */

const httpStatus = require('http-status');

const { UserRepo } = require('../../../database');
const response = require('../../../utils/response');
const { pickBy } = require('lodash');
const { firebaseMessaging } = require('../../../helpers');
const { ObjectId } = require('mongoose').Types;

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Users > Get User');

	let { user_id, email, mobile, token, message, title, channelId, channelName } = pickBy(req.body);

	try {
		let userFindQuery = {};

		if (user_id) {
			userFindQuery._id = ObjectId.createFromHexString(user_id);
		} else if (email) {
			userFindQuery.email = String(email).toLowerCase().trim();
		} else if (mobile) {
			userFindQuery.mobile = String(mobile);
		} else if (token) {
			userFindQuery.fcm_token = String(token);
		} else {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid Request. Please provide user_id, email, mobile or token');
		}

		if (!message) return response(res, httpStatus.BAD_REQUEST, 'Invalid Request. Please provide message');

		return UserRepo.findOne(userFindQuery).then((userResult) => {
			if (!userResult) return response(res, httpStatus.NOT_FOUND, 'User not found');

			let { fcm_token } = userResult;

			if (!fcm_token) return response(res, httpStatus.NOT_FOUND, 'User device has not registered for push notification. Please login to app and refresh token.');
			return firebaseMessaging
				.send({
					data: {
						channelId: channelId,
						channelName: channelName,
					},
					notification: {
						title,
						body: String(message),
					},
					token: fcm_token,
				})
				.then((result) => {
					return response(res, httpStatus.OK, 'Push notification sent successfully', result);
				})
				.catch((error) => {
					return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
				});
		});
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
