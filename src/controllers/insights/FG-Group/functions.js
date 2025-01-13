const { Joi, DayJS, nodeCache } = require('../../../services');
const Constants = require('../../../common');
const { JoiObjectIdValidator } = require('../../../helpers/joi-custom-validators.helpers');
const { OrdersRepo, InvoiceRepo, ExpenseRepo, UserRepo, UserServiceRepo, UserFitnessCourseRepo, FitnessCourseRepo } = require('../../../database');
const { Types } = require('mongoose');
const { isArray, pickBy, isEmpty, cloneDeep } = require('lodash');
const { GetOrderInsightsPrefix, GetInvoiceStatsPrefix, GetExpenseStatsPrefix } = require('../../../common/cache_key');
const { deleteCache, getCacheMetadata } = require('../../cache-manager/cache-manager');
const { getLoggerInstance } = require('../../../utils');
const GeneralCache = nodeCache('General');
const CacheTTL = 60 * 60; // 1 Hour
const LoggerPrefix = 'Controllers > Insights > FG Group > Functions';

/**
 * @author Brijesh Prajapati
 * @param {object} params
 * @param {string|string[]} params.purchase_mode
 * @param {string|string[]} params.gateway
 * @param {string|string[]} params.currency
 * @param {Date} params.from_date
 * @param {Date} params.to_date
 * @param {string|string[]} params.item_type
 * @param {string|string[]} params.order_status
 * @param {string|string[]} params.receipt_id
 * @param {string|string[]} params.user_id
 * @param {string|string[]} params.order_id
 * @param {boolean} params.reset_cache
 * @param {string|string[]} params.key
 * @returns {data: object[],metadata:object}
 */
async function getOrderStats(params) {
	const logger = getLoggerInstance(...arguments);
	logger.info(LoggerPrefix, '(getOrderStats)');

	const CacheKey = GetOrderInsightsPrefix + JSON.stringify(params);
	const PaymentModes = Object.values(Constants.purchaseMode);
	const Gateways = Object.values(Constants.paymentGateway);
	const OrderStatus = Object.values(Constants.orderStatus);
	const ItemTypes = Object.values(Constants.itemType);

	/**
	 *
	 * @param {string} value
	 * @param {import("joi").CustomHelpers} helpers
	 * @returns
	 */
	function orderInsightsKeyValidator(value, helpers) {
		if (isArray(value)) {
			for (let v of value) {
				const isValid = validateValues(v);
				if (isValid !== true) return isValid;
			}
			return value;
		} else {
			const isValid = validateValues(value);
			if (isValid !== true) return isValid;
			return value;
		}

		function validateValues(key) {
			let keys = extractKeys(key);
			if (keys.item_types && !ItemTypes.includes(keys.item_type)) return helpers.message(`1st value of key must be one of ${ItemTypes.join(', ')}`);
			if (keys.order_status && !OrderStatus.includes(keys.order_status)) return helpers.message(`2nd value of key must be one of ${OrderStatus.join(', ')}`);
			if (keys.purchase_mode && !PaymentModes.includes(keys.purchase_mode)) return helpers.message(`4th value of key must be one of ${PaymentModes.join(', ')}`);
			if (keys.gateway && !Gateways.includes(keys.gateway)) return helpers.message(`5th value of key must be one of ${Gateways.join(', ')}`);
			if (keys.purchase_mode === Constants.purchaseMode.manual && keys.gateway) return helpers.message(`5th value of key must be empty for manual purchase mode`);
			return true;
		}
	}

	function extractKeys(v) {
		let keys = v.split('#').map((k) => k.trim());
		let [item_type, order_status, currency, purchase_mode, gateway] = keys;
		return pickBy({ item_type, order_status, currency, purchase_mode, gateway });
	}

	const ValidationSchema = Joi.object({
		key: Joi.custom((v) => {
			if (!isArray(v)) return [v];
			return v;
		}).custom(orderInsightsKeyValidator, 'orderInsightsKeyValidator'),
		purchase_mode: Joi.alternatives(Joi.string().valid(...PaymentModes), Joi.array().items(Joi.string().valid(...PaymentModes))),
		gateway: Joi.alternatives(Joi.string().valid(...Gateways), Joi.array().items(Joi.string().valid(...Gateways))),
		from_date: Joi.date(),
		to_date: Joi.date(),
		item_type: Joi.alternatives(Joi.string().valid(...ItemTypes), Joi.array().items(Joi.string().valid(...ItemTypes))),
		order_status: Joi.alternatives(Joi.string().valid(...OrderStatus), Joi.array().items(Joi.string().valid(...OrderStatus))),
		receipt_id: Joi.alternatives(Joi.string(), Joi.array().items(Joi.string())),
		user_id: Joi.alternatives(
			Joi.custom(JoiObjectIdValidator, 'ObjectID').custom((v) => [new Types.ObjectId(v)]),
			Joi.array().items(Joi.custom(JoiObjectIdValidator, 'ObjectID'))
		),
		order_id: Joi.alternatives(
			Joi.custom(JoiObjectIdValidator, 'ObjectID').custom((v) => [new Types.ObjectId(v)]),
			Joi.array().items(Joi.custom(JoiObjectIdValidator, 'ObjectID'))
		),
		reset_cache: Joi.boolean(),
	}).when(Joi.object({ key: Joi.exist() }), {
		then: Joi.object({
			item_type: Joi.any().strip(),
			order_status: Joi.any().strip(),
			currency: Joi.any().strip(),
			purchase_mode: Joi.any().strip(),
			gateway: Joi.any().strip(),
		}),
	});

	let { error, value } = ValidationSchema.validate(params, { stripUnknown: true, convert: true });
	if (error) throw error;
	else params = value;

	if (params.reset_cache === true) {
		deleteCache(GeneralCache, { keys: CacheKey });
	}
	if (GeneralCache.has(CacheKey)) {
		const cacheData = GeneralCache.get(CacheKey);
		cacheData.metadata = {
			...cacheData.metadata,
			cache: getCacheMetadata({
				cacheName: 'General',
				key: CacheKey,
				prefix: GetOrderInsightsPrefix,
			}),
		};
		return cacheData;
	}

	if (Object.keys(params).length) {
		if (params.gateway && !isArray(params.gateway)) params.gateway = [params.gateway];
		if (params.purchase_mode && !isArray(params.purchase_mode)) params.purchase_mode = [params.purchase_mode];
		if (params.currency && !isArray(params.currency)) params.currency = [params.currency];
		if (params.order_status && !isArray(params.order_status)) params.order_status = [params.order_status];
		if (params.item_type && !isArray(params.item_type)) params.item_type = [params.item_type];
		if (params.receipt_id && !isArray(params.receipt_id)) params.receipt_id = [params.receipt_id];
		if (params.user_id && !isArray(params.user_id)) params.user_id = [params.user_id];
		if (params.order_id && !isArray(params.order_id)) params.order_id = [params.order_id];
	}

	if (params.key) {
		params.item_type = params.key.map((k) => extractKeys(k).item_type).filter((v) => v);
		params.order_status = params.key.map((k) => extractKeys(k).order_status).filter((v) => v);
		params.currency = params.key.map((k) => extractKeys(k).currency).filter((v) => v);
		params.purchase_mode = params.key.map((k) => extractKeys(k).purchase_mode).filter((v) => v);
		params.gateway = params.key.map((k) => extractKeys(k).gateway).filter((v) => v);
	}

	let matchQuery = {
		$and: [{ $or: [] }],
	};

	if (params?.user_id?.length) matchQuery.user_id = { $in: params.user_id.map((id) => new Types.ObjectId(id)) };
	if (params?.purchase_mode?.length) matchQuery.purchase_mode = { $in: Array.from(new Set(params.purchase_mode)) };
	if (params?.gateway?.length) matchQuery.gateway = { $in: Array.from(new Set(params.gateway)) };
	if (params?.currency?.length) {
		matchQuery.$and[0].$or.push({ currency: { $in: Array.from(new Set(params.currency)) } });
		matchQuery.$and[0].$or.push({ currency: { $exists: false } });
	}
	if (params?.order_status?.length) matchQuery.status = { $in: Array.from(new Set(params.order_status)) };
	if (params?.receipt_id?.length) matchQuery.receipt_id = { $in: Array.from(new Set(params.receipt_id)) };
	if (params?.order_id?.length) matchQuery._id = { $in: params.order_id.map((id) => new Types.ObjectId(id)) };
	if (params?.item_type?.length) matchQuery.order_item_type = { $in: Array.from(new Set(params.item_type)) };
	if (params.from_date || params.to_date) {
		matchQuery.createdAt = {};
		if (params.from_date) matchQuery.createdAt.$gte = params.from_date;
		if (params.to_date) matchQuery.createdAt.$lte = params.to_date;
	}

	const pipeline = [
		{
			$addFields: {
				itemStatsKey: {
					$concat: [
						'$order_item_type',
						'#',
						'$status',
						'#',
						{ $ifNull: ['$currency', ''] },
						'#',
						'$purchase_mode',
						{ $cond: { if: { $eq: ['$purchase_mode', Constants.purchaseMode.online] }, then: { $concat: ['#', '$gateway'] }, else: '' } },
					],
				},
			},
		},
		{
			$group: {
				_id: '$itemStatsKey',
				item_type: { $first: '$order_item_type' },
				order_status: { $first: '$status' },
				payment_currency: { $first: { $ifNull: ['$currency', undefined] } },
				purchase_mode: { $first: '$purchase_mode' },
				payment_gateway: { $first: { $cond: { if: { $eq: ['$purchase_mode', Constants.purchaseMode.online] }, then: '$gateway', else: undefined } } },
				order_count: { $sum: 1 },
				total_amount: { $sum: '$amount' },
				total_unpaid_amount: { $sum: { $cond: [{ $isNumber: '$payment_breakdowns.paid_amount' }, { $subtract: ['$amount', '$payment_breakdowns.paid_amount'] }, 0] } },
				from_date: { $min: '$createdAt' },
				to_date: { $max: '$createdAt' },
			},
		},
	];

	if (matchQuery.$and[0].$or.length === 0) delete matchQuery.$and[0].$or;
	if (isEmpty(matchQuery.$and[0])) delete matchQuery.$and;

	if (Object.keys(matchQuery).length) pipeline.unshift({ $match: matchQuery });

	return OrdersRepo.aggregate(pipeline).then((data) => {
		if (params.key) {
			data = data.filter((d) => params.key.includes(d._id));
		}

		let metadata = {
			total: data.length,
			generated_at: DayJS().toDate(),
			date: 'from_date and to_date are the first and last date of the data found for the particular key. It must be between the from_date and to_date of the query params if provided. It can be same if only one record found for the key.',
			key: {
				format: 'item_type#order_status#currency#purchase_mode#(gateway)',
				item_type: ItemTypes,
				order_status: OrderStatus,
				purchase_mode: PaymentModes,
				gateway: Gateways,
				_gateway: 'This value is only required for online purchase mode',
				_format_skip: 'To skip the any key from the key format, just keep it empty like item_type##currency#purchase_mode#gateway',
				_format_impact:
					'The key is used to filter the data based on the key. If key is provided, all other filters will be ignored that are part of the key. That filters are item_type, order_status, currency, purchase_mode, gateway.',
			},
		};

		let result = { data, metadata };

		GeneralCache.set(CacheKey, result, CacheTTL);

		return result;
	});
}
module.exports.getOrderStats = getOrderStats;

/**
 * @author Brijesh Prajapati
 * @param {object} params
 * @param {Date} params.from_date
 * @param {Date} params.to_date
 * @param {string[]} params.email
 * @param {string[]} params.mobile
 * @param {Date} params.createdAt_from
 * @param {Date} params.createdAt_to
 * @param {string[]} params.state
 * @param {string[]} params.city
 * @param {string[]} params.pin_code
 * @param {string[]} params.item_name
 * @param {string[]} params.bank_account_type
 * @param {string[]} params.bank_branch_code
 * @param {string[]} params.payment_method
 * @param {boolean} params.reset_cache
 * @param {string[]} params.invoice_category
 * @returns {data: object[],metadata:object}
 */
async function getInvoiceStats(params) {
	const logger = getLoggerInstance(...arguments);
	logger.info(LoggerPrefix, '(getInvoiceStats)');

	const InvoiceCategories = {
		private: 'Private',
		fg_group: 'FG Group',
		gomzi_nutrition: 'Gomzi Nutrition',
	};

	params = pickBy(params, (v) => v != '');

	const Schema = Joi.object({
		invoice_category: Joi.alternatives(
			Joi.string().custom((v) => [v]),
			Joi.array().items(Joi.string())
		),
		from_date: Joi.date(),
		to_date: Joi.date(),
		email: Joi.alternatives(
			Joi.string()
				.email()
				.custom((v) => [v]),
			Joi.array().items(Joi.string().email())
		),
		mobile: Joi.alternatives(
			Joi.string().custom((v) => [v]),
			Joi.array().items(Joi.string())
		),
		createdAt_from: Joi.date(),
		createdAt_to: Joi.date(),
		state: Joi.alternatives(
			Joi.string().custom((v) => [v]),
			Joi.array().items(Joi.string())
		),
		city: Joi.alternatives(
			Joi.string().custom((v) => [v]),
			Joi.array().items(Joi.string())
		),
		pin_code: Joi.alternatives(
			Joi.string().custom((v) => [v]),
			Joi.array().items(Joi.string())
		),
		item_name: Joi.alternatives(
			Joi.string().custom((v) => [v]),
			Joi.array().items(Joi.string())
		),
		bank_account_type: Joi.alternatives(
			Joi.string().custom((v) => [v]),
			Joi.array().items(Joi.string())
		),
		bank_branch_code: Joi.alternatives(
			Joi.string().custom((v) => [v]),
			Joi.array().items(Joi.string())
		),
		payment_method: Joi.alternatives(
			Joi.string().custom((v) => [v]),
			Joi.array().items(Joi.string())
		),
		reset_cache: Joi.boolean(),
	});

	let { error, value } = Schema.validate(params, { stripUnknown: true, convert: true });
	if (error) throw error;
	else params = value;

	const CacheKey = GetInvoiceStatsPrefix + JSON.stringify(params);

	if (params.reset_cache === true) {
		deleteCache(GeneralCache, { keys: CacheKey });
	}
	if (GeneralCache.has(CacheKey)) {
		const cacheData = GeneralCache.get(CacheKey);
		cacheData.metadata = {
			...cacheData.metadata,
			cache: getCacheMetadata({
				cacheName: 'General',
				key: CacheKey,
				prefix: GetInvoiceStatsPrefix,
			}),
		};
		return cacheData;
	}

	let findQuery = {};

	if (params.invoice_category) findQuery.invoice_category = { $in: params.invoice_category };

	if (params.from_date || params.to_date) {
		findQuery.date = {};
		if (params.from_date) findQuery.date.$gte = params.from_date;
		if (params.to_date) findQuery.date.$lte = params.to_date;
	}

	if (params.email) {
		findQuery.email = { $in: params.email };
	}

	if (params.mobile) {
		findQuery.mobile = { $in: params.mobile };
	}

	if (params.createdAt_from || params.createdAt_to) {
		findQuery.createdAt = {};
		if (params.createdAt_from) findQuery.createdAt.$gte = params.createdAt_from;
		if (params.createdAt_to) findQuery.createdAt.$lte = params.createdAt_to;
	}

	if (params.state) {
		findQuery['billing_address.state'] = { $in: params.state };
	}

	if (params.city) {
		findQuery['billing_address.city'] = { $in: params.city };
	}

	if (params.pin_code) {
		findQuery['billing_address.pin_code'] = { $in: params.pin_code };
	}

	if (params.item_name) {
		findQuery['items.item_name'] = { $in: params.item_name };
	}

	if (params.bank_account_type) {
		findQuery['bank_details.account_type'] = { $in: params.bank_account_type };
	}

	if (params.bank_branch_code) {
		findQuery['bank_details.branch_code'] = { $in: params.bank_branch_code };
	}

	if (params.payment_method) {
		findQuery.payment_method = { $in: params.payment_method };
	}

	let stats = {
		total_invoices: 0,
		total_amount: 0,
		total_paid_amount: 0,
		total_unpaid_amount: 0,
		since_date: null,
		to_date: null,
		since_createdAt: null,
		to_createdAt: null,
		invoice_category: Object.values(InvoiceCategories),
	};

	let pipeline = [
		{
			$group: {
				_id: null,
				total_invoices: { $sum: 1 },
				total_amount: { $sum: '$net_amount' },
				total_paid_amount: {
					$sum: { $ifNull: ['$paid_amount', 0] },
				},
				since_date: { $min: '$date' },
				to_date: { $max: '$date' },
				since_createdAt: { $min: '$createdAt' },
				to_createdAt: { $max: '$createdAt' },
				total_unpaid_amount: {
					$sum: {
						$cond: {
							if: { $gte: ['$net_amount', { $ifNull: ['$paid_amount', 0] }] },
							then: { $subtract: ['$net_amount', { $ifNull: ['$paid_amount', 0] }] },
							else: 0,
						},
					},
				},
				invoice_category: { $addToSet: '$invoice_category' },
			},
		},
	];

	if (Object.keys(findQuery).length) {
		pipeline.unshift({ $match: findQuery });
	}

	return InvoiceRepo.aggregate(pipeline).then((data) => {
		if (!data) {
			data = [stats];
		}

		let metadata = {
			generated_at: DayJS().toDate(),
		};

		let result = { data, metadata };

		GeneralCache.set(CacheKey, result, CacheTTL);

		return result;
	});
}
module.exports.getInvoiceStats = getInvoiceStats;

/**
 * @author Brijesh Prajapati
 * @param {object} params
 * @param {boolean} params.reset_cache
 * @returns {data: object[],metadata:object}
 */
async function getUsersStats(params) {
	const logger = getLoggerInstance(...arguments);
	const functionPrefix = '(getUserStats)';
	logger.info(LoggerPrefix, functionPrefix);
	const CacheKey = '@InsightsUsersStats';

	try {
		const paramSchema = Joi.object({
			reset_cache: Joi.boolean(),
		});

		let { error, value } = paramSchema.validate(params, { stripUnknown: true, convert: true });
		if (error) throw error;
		else params = value;

		if (params.reset_cache === true) {
			deleteCache(GeneralCache, { keys: CacheKey });
		}
		if (GeneralCache.has(CacheKey)) {
			let cacheData = GeneralCache.get(CacheKey);
			cacheData.metadata = {
				...cacheData.metadata,
				cache: getCacheMetadata({
					cacheName: 'General',
					key: CacheKey,
					prefix: CacheKey,
				}),
			};
			return cacheData;
		}

		const [activeUsers, deactivateUsers, deletedUsers, lockedUsers, alumniUsers, totalUsers, businessListingUsers, digitalUsers, fgiitUsers, fitnessUsers] = await Promise.all([
			UserRepo.find({ status: Constants.userStatus.active }).countDocuments(),
			UserRepo.find({ status: Constants.userStatus.deactivate }).countDocuments(),
			UserRepo.find({ status: Constants.userStatus.deleted }).countDocuments(),
			UserRepo.find({ lock: true }).countDocuments(),
			UserRepo.find({ alumni: true }).countDocuments(),
			UserRepo.countDocuments(),
			UserServiceRepo.find({ service: Constants.userService.businessListing, status: true }).countDocuments(),
			UserServiceRepo.find({ service: Constants.userService.digital, status: true }).countDocuments(),
			UserServiceRepo.find({ service: Constants.userService.fgiit, status: true }).countDocuments(),
			UserServiceRepo.find({ service: Constants.userService.fitness, status: true }).countDocuments(),
		]);

		let result_object = {
			status_wise: [
				{
					status: Constants.userStatus.active,
					count: activeUsers,
				},
				{
					status: Constants.userStatus.deactivate,
					count: deactivateUsers,
				},
				{
					status: 'locked',
					count: lockedUsers,
				},
				{
					status: Constants.userStatus.deleted,
					count: deletedUsers,
				},
				{
					status: 'alumni',
					count: alumniUsers,
				},
			],
			user_service_wise: [
				{
					service: Constants.userService.businessListing,
					count: businessListingUsers,
				},
				{
					service: Constants.userService.digital,
					count: digitalUsers,
				},
				{
					service: Constants.userService.fgiit,
					count: fgiitUsers,
				},
				{
					service: Constants.userService.fitness,
					count: fitnessUsers,
				},
			],
			total_users: totalUsers,
		};

		let returnData = {
			data: result_object,
			metadata: {
				generated_at: DayJS().toDate(),
			},
		};

		GeneralCache.set(CacheKey, returnData, CacheTTL);

		return returnData;
	} catch (error) {
		logger.error(LoggerPrefix, functionPrefix, error);
		throw error;
	}
}
module.exports.getUsersStats = getUsersStats;

/**
 * @author Brijesh Prajapati
 * @description Student Stats
 * @param {object} params
 * @returns {data: object[],metadata:object}
 */
async function getStudentsStats(params) {
	const logger = getLoggerInstance(...arguments);
	const functionPrefix = '(getStudentsStats)';
	logger.info(LoggerPrefix, functionPrefix);
	const CacheKey = '@InsightsStudentsStats';

	try {
		const paramSchema = Joi.object({
			reset_cache: Joi.boolean(),
		});

		let { error, value } = paramSchema.validate(params, { stripUnknown: true, convert: true });
		if (error) throw error;
		else params = value;

		if (params.reset_cache === true) {
			deleteCache(GeneralCache, { keys: CacheKey });
		}
		if (GeneralCache.has(CacheKey)) {
			let cacheData = GeneralCache.get(CacheKey);
			cacheData.metadata = {
				...cacheData.metadata,
				cache: getCacheMetadata({
					cacheName: 'General',
					key: CacheKey,
					prefix: CacheKey,
				}),
			};
			return cacheData;
		}

		let alumniPipelineObject = [
			{
				$lookup: {
					from: UserServiceRepo.collection.collectionName,
					let: { user_id: '$_id' },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [{ $eq: ['$user_id', '$$user_id'] }, { $eq: ['$service', Constants.userService.fgiit] }],
								},
							},
						},
					],
					as: 'fgiit',
				},
			},
			{
				$match: {
					fgiit: { $ne: [] },
					alumni: true,
				},
			},
			{
				$count: 'count',
			},
		];

		let nonAlumniPipelineObject = cloneDeep(alumniPipelineObject);
		nonAlumniPipelineObject[1].$match.alumni = false;

		const [online_course_student, offline_course_student, flexible_learning_student, studentAlumni, studentNonAlumni] = await Promise.all([
			UserFitnessCourseRepo.aggregate(courseWisePipelineObject(Constants.CourseCategory.online)),
			UserFitnessCourseRepo.aggregate(courseWisePipelineObject(Constants.CourseCategory.offline)),
			UserFitnessCourseRepo.aggregate(courseWisePipelineObject(Constants.CourseCategory.flexible)),
			UserRepo.aggregate(alumniPipelineObject),
			UserRepo.aggregate(nonAlumniPipelineObject),
		]);

		let studentAlumniCount = studentAlumni[0]?.count || 0;
		let studentNonAlumniCount = studentNonAlumni[0]?.count || 0;

		const result = {
			counts: {
				student_user: studentAlumniCount + studentNonAlumniCount,
				online_course_student: online_course_student[0]?.count || 0,
				offline_course_student: offline_course_student[0]?.count || 0,
				flexible_learning_student: flexible_learning_student[0]?.count || 0,
				alumni: studentAlumni[0]?.count || 0,
				non_alumni: studentNonAlumni[0]?.count || 0,
			},
		};

		let returnResult = {
			data: result,
			metadata: {
				generated_at: DayJS().toDate(),
			},
		};

		GeneralCache.set(CacheKey, returnResult, CacheTTL);

		return returnResult;
	} catch (error) {
		logger.error(LoggerPrefix, functionPrefix, error);
		throw error;
	}

	function courseWisePipelineObject(courseCategory) {
		return [
			{
				$lookup: {
					from: FitnessCourseRepo.collection.collectionName,
					let: { course_id: '$course_id' },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [{ $eq: ['$_id', '$$course_id'] }, { $eq: ['$course_category', courseCategory] }],
								},
							},
						},
					],
					as: 'course',
				},
			},
			{
				$unwind: '$course',
			},
			{
				$group: {
					_id: '$user_id',
				},
			},
			{
				$count: 'count',
			},
		];
	}
}
module.exports.getStudentsStats = getStudentsStats;

/**
 * @author Brijesh Prajapati
 * @param {object} params
 * @param {Date} params.from_date
 * @param {Date} params.to_date
 * @param {Date} params.createdAt_from
 * @param {Date} params.createdAt_to
 * @param {string[]} params.item_name
 * @param {string[]} params.payment_method
 * @param {boolean} params.reset_cache
 * @param {string[]} params.expense_company
 * @returns {data: object[],metadata:object}
 */

async function getExpenseStats(params) {
	const logger = getLoggerInstance(...arguments);
	logger.info(LoggerPrefix, '(getExpenseStats)');

	const expenseCompany = {
		private: 'Private',
		fg_group: 'FG Group',
		gomzi_nutrition: 'Gomzi Nutrition',
	};

	params = pickBy(params, (v) => v != '');

	const Schema = Joi.object({
		expense_company: Joi.alternatives(
			Joi.string().custom((v) => [v]),
			Joi.array().items(Joi.string())
		),
		from_date: Joi.date(),
		to_date: Joi.date(),
		createdAt_from: Joi.date(),
		createdAt_to: Joi.date(),
		item_name: Joi.alternatives(
			Joi.string().custom((v) => [v]),
			Joi.array().items(Joi.string())
		),
		payment_method: Joi.alternatives(
			Joi.string().custom((v) => [v]),
			Joi.array().items(Joi.string())
		),
		reset_cache: Joi.boolean(),
	});

	let { error, value } = Schema.validate(params, { stripUnknown: true, convert: true });
	if (error) throw error;
	else params = value;

	const CacheKey = GetExpenseStatsPrefix + JSON.stringify(params);

	if (params.reset_cache === true) {
		deleteCache(GeneralCache, { keys: CacheKey });
	}
	if (GeneralCache.has(CacheKey)) {
		const cacheData = GeneralCache.get(CacheKey);
		cacheData.metadata = {
			...cacheData.metadata,
			cache: getCacheMetadata({
				cacheName: 'General',
				key: CacheKey,
				prefix: GetExpenseStatsPrefix,
			}),
		};
		return cacheData;
	}

	let findQuery = {};

	if (params.expense_company) findQuery.expense_company = { $in: params.expense_company };

	if (params.from_date || params.to_date) {
		findQuery.date = {};
		if (params.from_date) findQuery.date.$gte = params.from_date;
		if (params.to_date) findQuery.date.$lte = params.to_date;
	}

	if (params.createdAt_from || params.createdAt_to) {
		findQuery.createdAt = {};
		if (params.createdAt_from) findQuery.createdAt.$gte = params.createdAt_from;
		if (params.createdAt_to) findQuery.createdAt.$lte = params.createdAt_to;
	}

	if (params.item_name) {
		findQuery['items.item_name'] = { $in: params.item_name };
	}

	if (params.payment_method) {
		findQuery.payment_method = { $in: params.payment_method };
	}

	let stats = {
		total_expense: 0,
		total_amount: 0,
		since_date: null,
		to_date: null,
		since_createdAt: null,
		to_createdAt: null,
		expense_company: Object.values(expenseCompany),
	};

	let pipeline = [
		{
			$group: {
				_id: null,
				total_expense: { $sum: 1 },
				total_amount: { $sum: '$total_amount' },
				since_date: { $min: '$date' },
				to_date: { $max: '$date' },
				since_createdAt: { $min: '$createdAt' },
				to_createdAt: { $max: '$createdAt' },
				expense_company: { $addToSet: '$expense_company' },
			},
		},
	];

	if (Object.keys(findQuery).length) {
		pipeline.unshift({ $match: findQuery });
	}

	return ExpenseRepo.aggregate(pipeline).then((data) => {
		if (!data) {
			data = [stats];
		}

		let metadata = {
			generated_at: DayJS().toDate(),
		};

		let result = { data, metadata };

		GeneralCache.set(CacheKey, result, CacheTTL);

		return result;
	});
}

module.exports.getExpenseStats = getExpenseStats;
