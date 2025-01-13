// You can add common or constant here
module.exports.common_environment = {
	development: 'development',
	production: 'production',
};

module.exports.adminType = {
	master: 'MASTER',
	admin: 'Admin',
	franchise: 'Franchise',
	employee: 'Employee',
	trainer: 'Trainer',
	store: 'Store',
};

module.exports.userStatus = {
	active: 'ACTIVE', // Active User
	deleted: 'DELETED', // Deleted by user itself or Admin
	deactivate: 'DEACTIVATED', // Deactivate by Admin or User itself
};

module.exports.MFAMethods = {
	authenticator: 'authenticator',
};

module.exports.gender = {
	male: 'MALE',
	female: 'FEMALE',
	other: 'OTHER',
};

module.exports.status = {
	active: 'ACTIVE',
	deleted: 'DELETED',
	pending: 'PENDING',
	inactive: 'INACTIVE',
};

module.exports.purchaseMode = {
	online: 'ONLINE', // Purchase by User - Using Online Web Service
	manual: 'MANUAL', // Added by Admin
	cashOnDelivery: 'Cash On Delivery', // Purchase by User - Using Online Web Service (COD)
};

module.exports.paymentGateway = {
	razorpay: 'RAZORPAY', // Registered Email: fitnesswithgomzi@gmail.com (Merchant ID: CiS87S7GTMLS25)
	razorpay_fgiit: 'RAZORPAY_FGIIT', // Registered Email: fgiitsurat@gmail.com (Merchant ID: IwHEpNNtAPrDLR)
	razorpay_fgmeals: 'RAZORPAY_FGMEALS', // Registered Email: gomzinutrition@gmail.com (Merchant ID: OejSEaaVBvxRmf)
	razorpay_gomzi_consulting: 'RAZORPAY GOMZI CONSULTING', // Registered Email: ashishjani672@gmail.com (Merchant ID: PJ728F7GxhfZkN)
};

module.exports.orderStatus = {
	success: 'SUCCESS', // After Successful Payment
	pending: 'PENDING', // Before Successful Payment
	failed: 'FAILED', // Failed due to not paid for long time
	cancelled: 'CANCELLED', // Cancelled by user
	refunded: 'REFUNDED', // Refunded by admin
};

module.exports.itemType = {
	meals: 'FG_MEAL_PRODUCT', // Ref.: FG Meals Product
	pt_plan: 'PT_PLAN', // Ref.: FWG > PT Plan
	fitness_course: 'FITNESS_COURSE', // Ref.: FG IIT > Fitness Course,
	digital_plan: 'DIGITAL_PLAN', // Ref.: FG Digital > Digital Plan
	books: 'BOOKS', // Ref.: Books [FGIIT]
	ebooks: 'EBOOKS', // Ref.: E-Books [FGIIT]
	item_cart: 'CART',
};

module.exports.userService = {
	meals: 'FG-MEALS',
	digital: 'FG-DIGITAL',
	fgiit: 'FGIIT',
	fitness: 'FWG',
	businessListing: 'BUSINESS-LISTING',
};

module.exports.CourseCategory = {
	online: 'Online Course',
	offline: 'Offline Course',
	flexible: 'Flexible Learning',
};

module.exports.CacheConstants = require('./cache_key');

module.exports.ChatRecordType = {
	text: 'text',
	image: 'image',
	video: 'video',
	audio: 'audio',
	pdf: 'pdf',
};

const jobPostClickTypes = ['sms', 'call', 'email', 'whatsapp', 'click'];
module.exports.jobPostClickTypes = jobPostClickTypes;
