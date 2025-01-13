/**
 * @author Brijesh Prajapati
 * @description Login into Admin Account and Get Authorization Token
 */

const httpStatus = require('http-status'),
	{ AdminRepo, OtpRepo } = require('../../../database'),
	{ bcryptjs, jwt, nodemailer, DayJS } = require('../../../services'),
	{ isEmpty } = require('lodash'),
	response = require('../../../utils/response');
const { emailTemplate } = require('../../../helpers');
const { randomDigit } = require('../../../utils/random');
const process = require('process');

module.exports.Login = async (req, res) => {
	req.logger.info('Controller > Admin > Account > Login with OTP');

	try {
		const { email, password } = req.body;

		// Validation
		if (isEmpty(email) || isEmpty(password)) {
			return response(res, httpStatus.BAD_REQUEST, 'Email and password is required');
		}

		// DB: Find
		let result = await AdminRepo.findOne({ email, status: true }).select('+password +authToken');

		if (result) {
			// Compare Hash Password
			return bcryptjs
				.compare(password, result.password)
				.then(async () => {
					// Send OTP
					let payload = {
						user_id: result._id,
						otp_code: randomDigit(6),
						via: 'LOGIN/Authorization',
						send_to: email,
						createdBy: result._id,
						updatedBy: result._id,
						expiredAt: DayJS().add(24, 'hours').toDate(),
					};

					let findExistingOTP = await OtpRepo.findOne({ user_id: result._id, isActive: true, via: payload.via, send_to: email, expiredAt: { $gte: DayJS().add(1, 'hours').toDate() } });

					if (!findExistingOTP) {
						findExistingOTP = await OtpRepo.create(payload);
					}

					response(res, httpStatus.OK, 'OTP has been sent to your email address', {
						verification_id: findExistingOTP._id,
						otp: process.env.NODE_ENV === 'development' ? findExistingOTP.otp_code : undefined,
					});

					return emailTemplate(emailTemplate.templates.EMAIL_OTP, { otp_code: findExistingOTP.otp_code })
						.then((emailBody) => {
							nodemailer('fitnesswithgomzi@gmail.com', findExistingOTP.send_to, 'OTP for Login in Administration Panel', emailBody).catch((error) => {
								return req.logger.error(res, httpStatus.INTERNAL_SERVER_ERROR, 'Something went wrong while sending OTP', error);
							});
						})
						.catch(() => {
							return req.logger.error(res, httpStatus.INTERNAL_SERVER_ERROR, 'Something went wrong while sending OTP');
						});
				})
				.catch((error) => {
					return response(res, httpStatus.BAD_REQUEST, 'Invalid Email or Password', error);
				});
		} else {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid Email or Password');
		}
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

module.exports.VerifyOTP = async (req, res) => {
	req.logger.info('Controller > Admin > Account > Verify OTP');

	try {
		const { verification_id, otp } = req.body;

		// Validation
		if (isEmpty(verification_id) || isEmpty(otp)) {
			return response(res, httpStatus.BAD_REQUEST, 'Verification ID and OTP is required');
		}

		// DB: Find
		let findExistingOTP = await OtpRepo.findOneAndUpdate({ _id: verification_id, otp_code: otp, isActive: true }, { isActive: false }, { new: true });

		if (findExistingOTP) {
			// Find Admin
			let result = await AdminRepo.findOne({ _id: findExistingOTP.user_id, status: true });

			let authorization = {
				id: result._id,
				type: result.type,
				franchise_id: result?.franchise_id,
				authToken: result.authToken,
				via: 'LOGIN',
			};

			authorization = jwt.sign(authorization, '30d');
			findExistingOTP.deleteOne().catch(() => {});

			return response(res, httpStatus.OK, 'Always send header as "authorization" for authorization Required APIs', { authorization });
		} else {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid OTP. Please try again.');
		}
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
