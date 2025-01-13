const httpStatus = require('http-status');
const response = require('../../../utils/response');
const { InvoiceRepo } = require('../../../database');
const { PaginationHelper, MongoDBQueryBuilder } = require('../../../helpers');
const { DayJS, Joi } = require('../../../services');
const { regexValidateUtil } = require('../../../utils');
const { isNumber, isUndefined } = require('lodash');
const { JoiObjectIdValidator, JoiPaginationSchema, JoiSortSchema, JoiSearchSchema } = require('../../../helpers/joi-custom-validators.helpers');
const { deleteCache } = require('../../cache-manager/cache-manager');
const { GetInvoiceStatsPrefix } = require('../../../common/cache_key');
const { ObjectId } = require('mongoose').Types;

module.exports.createInvoice = async (req, res) => {
	req.logger.info('Controllers > Admin > Invoice > Create Invoice');

	try {
		const { adminAuthData } = req.headers;
		const { date, name, email, mobile, address, item_name, payment_method, net_amount, paid_amount, note, invoice_number, due_date } = req.body;

		let payload = {
			createdById: adminAuthData.id,
			updatedById: adminAuthData.id,
		};

		if (DayJS(date, 'YYYY/MM/DD', true).isValid() === false) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid date. It must be in YYYY/MM/DD format.');
		} else {
			payload.date = new Date(date);
		}

		if (DayJS(due_date, 'YYYY/MM/DD', true).isValid() === false) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid Due Date. It must be in YYYY/MM/DD format.');
		} else {
			payload.due_date = new Date(due_date);
		}

		if (invoice_number) {
			if (isNaN(invoice_number)) {
				return response(res, httpStatus.BAD_REQUEST, 'Invoice number must be a number.');
			}

			payload.invoice_number = Number(invoice_number);
		} else {
			payload.invoice_number = await getNextInvoiceSequence();
		}

		if (!name) {
			return response(res, httpStatus.BAD_REQUEST, 'Name is required.');
		} else {
			payload.name = name;
		}

		if (email) {
			if (regexValidateUtil.email(email) === false) {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid email.');
			}
			payload.email = email;
		}

		if (mobile) {
			payload.mobile = mobile;
		}

		if (!address) return response(res, httpStatus.BAD_REQUEST, 'Address is required.');
		else payload.address = address;

		if (!item_name) return response(res, httpStatus.BAD_REQUEST, 'Item name is required.');
		else payload.item_name = item_name;

		if (!payment_method) {
			return response(res, httpStatus.BAD_REQUEST, 'Payment method is required.');
		} else {
			payload.payment_method = payment_method;
		}

		// if (!branch_name) {
		// 	return response(res, httpStatus.BAD_REQUEST, 'branch_name is required.');
		// } else {
		// 	payload.branch_name = branch_name;
		// }

		if (!net_amount) {
			return response(res, httpStatus.BAD_REQUEST, 'Net amount is required.');
		} else if (!isNumber(net_amount)) {
			return response(res, httpStatus.BAD_REQUEST, 'Net amount must be a number.');
		} else if (net_amount <= 0) {
			return response(res, httpStatus.BAD_REQUEST, 'Net amount must be greater than 0.');
		} else {
			payload.net_amount = Number(net_amount);
		}

		if (isUndefined(paid_amount)) {
			return response(res, httpStatus.BAD_REQUEST, 'Paid amount is required.');
		} else if (!isNumber(paid_amount)) {
			return response(res, httpStatus.BAD_REQUEST, 'Paid amount must be a number.');
		} else if (paid_amount < 0) {
			return response(res, httpStatus.BAD_REQUEST, 'Paid amount must be greater than 0.');
		} else if (paid_amount > net_amount) {
			return response(res, httpStatus.BAD_REQUEST, 'Paid amount must be less than or equal to net amount.');
		} else {
			payload.paid_amount = Number(paid_amount);
		}

		if (note) {
			payload.note = String(note).trim();
		}

		return InvoiceRepo.create(payload)
			.then((result) => {
				deleteCache('General', { prefix: [GetInvoiceStatsPrefix] });
				return response(res, httpStatus.CREATED, 'Invoice created successfully.', result);
			})
			.catch((error) => {
				return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
			});
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

module.exports.getInvoice = async (req, res) => {
	req.logger.info('Controllers > Admin > Invoice > Get Invoice');

	try {
		let findQuery = {};

		const ValidationSchema = Joi.object({
			id: Joi.string().custom(JoiObjectIdValidator).optional(),
			unpaid_only: Joi.boolean().optional(),
			paid_only: Joi.boolean().optional(),
			from_date: Joi.date().optional(),
			to_date: Joi.date().optional(),
		})
			.concat(JoiSearchSchema)
			.concat(JoiPaginationSchema)
			.concat(JoiSortSchema);

		const { error, value } = ValidationSchema.validate(req.query, { stripUnknown: true, convert: true });
		if (error) return response(res, error);
		else req.query = value;

		if (req.query.id) {
			if (!ObjectId.isValid(req.query.id)) {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid invoice id.');
			}

			findQuery._id = ObjectId.createFromHexString(req.query.id);
		}

		if (req.query.from_date || req.query.to_date) {
			findQuery.date = {};

			if (req.query.from_date) {
				findQuery.date.$gte = req.query.from_date;
			}

			if (req.query.to_date) {
				findQuery.date.$lte = req.query.to_date;
			}
		}

		if (req.query.unpaid_only) {
			findQuery.$expr = { $lt: ['$paid_amount', '$net_amount'] };
		} else if (req.query.paid_only) {
			findQuery.$expr = { $eq: ['$paid_amount', '$net_amount'] };
		}

		const SearchFields = ['_id', 'invoice_number', 'name', 'email', 'mobile', 'payment_method', 'items[].item_name'];
		Object.assign(findQuery, MongoDBQueryBuilder.searchTextQuery(req.query.search, SearchFields));

		const pagination = PaginationHelper.getPagination(req.query);
		const SortQuery = MongoDBQueryBuilder.sortQuery(req.query.sort, req.query.sortOrder);
		const CountDocs = await InvoiceRepo.countDocuments(findQuery);
		const PaginationInfo = PaginationHelper.getPaginationInfo(CountDocs, req.query);

		// DB: Find
		return InvoiceRepo.find(findQuery)
			.skip(pagination.skip)
			.limit(pagination.limit)
			.sort(SortQuery)
			.lean()
			.then((result) => {
				return response(res, httpStatus.OK, 'success', result, undefined, {
					pagination: PaginationInfo,
					search_fields: SearchFields,
				});
			})
			.catch((error) => response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error));
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

module.exports.updateInvoice = async (req, res) => {
	req.logger.info('Controllers > Admin > Invoice > Update Invoice');

	try {
		const { adminAuthData } = req.headers;
		const { id, date, name, email, mobile, address, item_name, payment_method, net_amount, paid_amount, note, invoice_number, due_date } = req.body;

		if (!id || !ObjectId.isValid(id)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid invoice id.');
		}

		let getInvoice = await InvoiceRepo.findOne({ _id: id });

		if (!getInvoice) {
			return response(res, httpStatus.NOT_FOUND, 'Invoice not found.', { id });
		}

		if (invoice_number) {
			if (isNaN(invoice_number)) {
				return response(res, httpStatus.BAD_REQUEST, 'Invoice number must be a number.');
			}

			getInvoice.invoice_number = invoice_number;
		}

		getInvoice.updatedById = adminAuthData.id;

		if (date) {
			if (DayJS(date, 'YYYY/MM/DD', true).isValid() === false) {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid date. It must be in YYYY/MM/DD format.');
			} else {
				getInvoice.date = new Date(date);
			}
		}

		if (due_date) {
			if (DayJS(due_date, 'YYYY/MM/DD', true).isValid() === false) {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid Due Date. It must be in YYYY/MM/DD format.');
			} else {
				getInvoice.due_date = new Date(due_date);
			}
		}

		if (name) {
			getInvoice.name = name;
		}

		if (email) {
			if (regexValidateUtil.email(email) === false) {
				return response(res, httpStatus.BAD_REQUEST, 'Invalid email.');
			}

			getInvoice.email = email;
		}

		if (mobile) {
			getInvoice.mobile = mobile;
		}

		// if (branch_name) {
		// 	getInvoice.branch_name = branch_name;
		// }

		if (!address) return response(res, httpStatus.BAD_REQUEST, 'Address is required.');
		else getInvoice.address = address;

		if (!item_name) return response(res, httpStatus.BAD_REQUEST, 'Item name is required.');
		else getInvoice.item_name = item_name;

		if (!payment_method) {
			return response(res, httpStatus.BAD_REQUEST, 'Payment method is required.');
		} else {
			getInvoice.payment_method = payment_method;
		}

		let netAmount = net_amount || getInvoice.net_amount;
		if (isUndefined(netAmount)) {
			return response(res, httpStatus.BAD_REQUEST, 'Net amount is required.');
		} else if (!isNumber(netAmount)) {
			return response(res, httpStatus.BAD_REQUEST, 'Net amount must be a number.');
		} else if (netAmount <= 0) {
			return response(res, httpStatus.BAD_REQUEST, 'Net amount must be greater than 0.');
		} else {
			getInvoice.net_amount = Number(netAmount);
		}

		let paidAmount = getInvoice.paid_amount;
		if (!isUndefined(paid_amount)) paidAmount = paid_amount;

		if (isUndefined(paidAmount)) {
			return response(res, httpStatus.BAD_REQUEST, 'Paid amount is required.');
		} else if (!isNumber(paidAmount)) {
			return response(res, httpStatus.BAD_REQUEST, 'Paid amount must be a number.');
		} else if (paidAmount < 0) {
			return response(res, httpStatus.BAD_REQUEST, 'Paid amount must be greater than 0.');
		} else if (paidAmount > net_amount) {
			return response(res, httpStatus.BAD_REQUEST, 'Paid amount must be less than or equal to net amount.');
		} else {
			getInvoice.paid_amount = Number(paidAmount);
		}

		if (note) {
			getInvoice.note = String(note).trim();
		}

		getInvoice
			.save()
			.then((result) => {
				deleteCache('General', { prefix: [GetInvoiceStatsPrefix] });
				return response(res, httpStatus.OK, 'Invoice updated successfully.', result);
			})
			.catch((error) => {
				return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
			});
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

module.exports.deleteInvoice = async (req, res) => {
	req.logger.info('Controllers > Admin > Invoice > Delete Invoice');

	try {
		const { id } = req.query;

		if (!id || !ObjectId.isValid(id)) {
			return response(res, httpStatus.BAD_REQUEST, 'Invalid invoice id.');
		}

		let getInvoice = await InvoiceRepo.findOne({ _id: id });

		if (!getInvoice) {
			return response(res, httpStatus.NOT_FOUND, 'Invoice not found.', { id });
		}

		getInvoice
			.deleteOne()
			.then(() => {
				deleteCache('General', { prefix: [GetInvoiceStatsPrefix] });
				return response(res, httpStatus.OK, 'Invoice deleted successfully.');
			})
			.catch((error) => {
				return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
			});
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

module.exports.getNextInvoiceSequence = async (req, res) => {
	req.logger.info('Controllers > Admin > Invoice > Get Next Invoice Sequence');

	try {
		let nextInvoiceNumber = await getNextInvoiceSequence();

		return response(res, httpStatus.OK, 'success', { next_invoice_number: nextInvoiceNumber });
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};

async function getNextInvoiceSequence() {
	let findNextUniqueSequence = true;
	let nextInvoiceNumber = await InvoiceRepo.countDocuments();

	do {
		nextInvoiceNumber++;

		let isInvoiceExists = await InvoiceRepo.exists({ invoice_number: nextInvoiceNumber });

		if (!isInvoiceExists) {
			findNextUniqueSequence = false;
		}
	} while (findNextUniqueSequence);

	return nextInvoiceNumber;
}

module.exports.getStats = async (req, res) => {
	req.logger.info('Controllers > Admin > Invoice > Get Stats');
	res.set('Deprecation', true);
	res.set('Warning', 'This endpoint is deprecated and will be removed in future versions. Please use Insights API (/admin/v1/insights/fg-group).');

	try {
		let query = [
			{
				$match: req.query,
			},
			{
				$group: {
					_id: undefined,
					total_invoices: { $sum: 1 },
					total_net_amount: { $sum: '$net_amount' },
					total_paid_amount: { $sum: '$paid_amount' },
					total_due_amount: { $sum: { $subtract: ['$net_amount', '$paid_amount'] } },
				},
			},
		];

		let result = await InvoiceRepo.aggregate(query);
		return response(res, httpStatus.OK, 'success', result);
	} catch (error) {
		return response(res, httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Something went wrong', error);
	}
};
