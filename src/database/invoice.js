/**
 * @author Brijesh Prajapati
 * @description Common Invoice Schema. It may be extended to order invoice, user invoice, etc.
 */

const mongoose = require('mongoose'),
	ObjectId = mongoose.Types.ObjectId;

let required = true,
	trim = true;

const MongooseSchema = new mongoose.Schema(
	{
		invoice_number: { type: Number, required },
		date: { type: Date, required, trim },
		name: { type: String, required, trim },
		email: { type: String, trim, lowercase: true },
		mobile: { type: String, trim },
		// branch_name: { type: String, required, trim },
		address: { type: String, trim },
		item_name: { type: String, required, trim },
		payment_method: { type: String },
		net_amount: { type: Number, required, trim },
		paid_amount: { type: Number, trim },
		note: { type: String, trim },
		due_date: { type: Date, required, trim },
		createdById: { type: ObjectId, trim },
		updatedById: { type: ObjectId, trim },
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model('invoices', MongooseSchema, 'invoices');
