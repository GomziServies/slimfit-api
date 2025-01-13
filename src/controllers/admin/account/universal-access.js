/**
 * @author Brijesh Prajapati
 * @description Login into Admin Account and Get Authorization Token
 */

const httpStatus = require('http-status'),
	{ AdminRepo } = require('../../../database'),
	response = require('../../../utils/response');
const { AxiosHelpers } = require('../../../helpers');
const process = require('process');

const Platforms = {
	fwg: 'fwg',
	fg_group: 'fg_group',
	gcs: 'gcs',
};

module.exports = async (req, res) => {
	const logger = req.logger;
	logger.info('Controller > Admin > Account > Universal Access');

	const { adminAuthData } = req.headers;
	try {
		let adminAccount = await AdminRepo.findOne({ _id: adminAuthData.id });

		let accounts_access = [
			{
				platform: Platforms.fg_group,
				access: req.headers.authorization,
			},
		];

		let availablePlatforms = [
			{
				platform: Platforms.fwg,
				email: adminAccount.email,
			},
			{
				platform: Platforms.gcs,
				email: adminAccount.email,
			},
		];

		await Promise.all(
			availablePlatforms.map(async (platformAccount) => {
				switch (platformAccount.platform) {
					case Platforms.fwg:
						try {
							let fwgToken = await requestFWGAccess(platformAccount.email);
							if (fwgToken) {
								accounts_access.push({
									platform: platformAccount.platform,
									access: fwgToken.data.authorization,
								});
							}
						} catch (error) {
							let e = AxiosHelpers.ErrorParser(error);
							logger.error('Error while requesting FWG access', e);
							accounts_access.push({
								platform: platformAccount.platform,
								error: e.message || e,
							});
						}
						break;
					case Platforms.gcs:
						try {
							let gcsToken = await requestGCSAccess(platformAccount.email);
							if (gcsToken) {
								accounts_access.push({
									platform: platformAccount.platform,
									access: gcsToken.data.authorization,
								});
							}
						} catch (error) {
							let e = AxiosHelpers.ErrorParser(error);
							logger.error('Error while requesting GCS access', e);
							accounts_access.push({
								platform: platformAccount.platform,
								error: e.message || e,
							});
						}
						break;
					default:
						break;
				}
			})
		);

		return response(res, httpStatus.OK, 'Accounts access granted', accounts_access);
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

async function requestFWGAccess(email) {
	// Request access to FWG API
	return await AxiosHelpers.APIGet({
		url: `${process.env.FWG_API_URL}/universal-access/${email}`,
		timeout: 5000,
		timeoutErrorMessage: 'Request timeout. Failed to get access token within 5 seconds',
	}).then((response) => response.data);
}

async function requestGCSAccess(email) {
	// Request access to GCS API
	return await AxiosHelpers.APIGet({
		url: `${process.env.GCS_API_URL}/universal-access/${email}`,
		timeout: 5000,
		timeoutErrorMessage: 'Request timeout. Failed to get access token within 5 seconds',
	}).then((response) => response.data);
}
