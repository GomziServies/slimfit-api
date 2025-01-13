/**
 * @author Brijesh Prajapati
 * @description Create Admin Account
 */

const httpStatus = require('http-status'),
	{ AdminRepo } = require('../../../database'),
	{ bcryptjs } = require('../../../services'),
	{ isEmpty } = require('lodash'),
	{ adminType } = require('../../../common'),
	response = require('../../../utils/response');
const { isValidObjectId } = require('mongoose');
const { MongoDBErrorParser } = require('../../../helpers');
const { ObjectId } = require('mongoose').Types;

module.exports = async (req, res) => {
	req.logger.info('Controller > Admin > Account > Create User');

	const { full_name, email, mobile, type, password } = req.body;
	const { franchise_id } = req.body;
	// const { adminAuthData } = req.headers;

	// if (adminAuthData.type != adminType.master) return response(res, httpStatus.FORBIDDEN, 'You are not authorized to perform this action');

	var payload = {
		full_name,
		email,
		mobile,
		// createdBy: ObjectId.createFromHexString(adminAuthData.id),
	};

	try {
		if (isEmpty(full_name) || isEmpty(password) || isEmpty(email) || isEmpty(mobile)) {
			return response(res, httpStatus.BAD_REQUEST, 'Full Name, Email, Mobile, Password and Admin Type are required');
		}

		// Check For User -Email
		let adminUser = await AdminRepo.exists({ email, status: true, mobile });
		if (adminUser) {
			return response(res, httpStatus.CONFLICT, 'Email or Mobile already exists. Both must be unique');
		}

		// Password Hash using Bcrypt JS
		payload.password = await bcryptjs.hash(password);

		if (type) {
			if (![adminType.admin, adminType.franchise, adminType.employee, adminType.store].includes(type)) {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid Admin Type', { valid_admin_type: [adminType.franchise, adminType.admin, adminType.employee, adminType.store] });
			}

			if (type == adminType.franchise) {
				if (!franchise_id) {
					return response(res, httpStatus.BAD_REQUEST, 'franchise_id is required for franchise admin');
				}

				if (!isValidObjectId(franchise_id)) {
					return response(res, httpStatus.BAD_REQUEST, 'franchise_id is not valid');
				}

				payload.type = type;
				payload.franchise_id = ObjectId.createFromHexString(franchise_id);
			}

			if (type == adminType.employee) {
				payload.type = type;
			}

			if (type == adminType.store) {
				payload.type = type;
			}
		}

		// DB: Create
		AdminRepo.create(payload)
			.then(() => response(res, httpStatus.OK, 'success'))
			.catch((error) => response(res, MongoDBErrorParser(error)));
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
