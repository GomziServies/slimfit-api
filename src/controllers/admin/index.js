/**
 * @author Brijesh Prajapati
 * @description Export Admin Controllers
 */

// Account Controllers
module.exports.createAccountController = require('./account/create-user');
module.exports.loginController = require('./account/login');
module.exports.loginWithOTPController = require('./account/login-with-otp');
module.exports.getProfileController = require('./account/get-profile');
module.exports.updateProfileController = require('./account/update-profile');
module.exports.changePasswordController = require('./account/change-password');
module.exports.getUniversalAccessController = require('./account/universal-access');

// Admin User Controller
module.exports.getAdminController = require('./admin-user/get-admin');
module.exports.updateAdminProfileController = require('./admin-user/update-profile');
module.exports.resetSubAdminPasswordController = require('./admin-user/reset-password');
module.exports.removeSubAdminPasswordController = require('./admin-user/remove-admin');

// User
module.exports.getUserController = require('./users/get-user');
module.exports.updateUserController = require('./users/update-user');
module.exports.unlockUserController = require('./users/unlock-user');
module.exports.removeUserController = require('./users/remove-user');
module.exports.createUserController = require('./users/create-user');
module.exports.getStudentUserController = require('./users/get-student-user');
module.exports.sendFCMNotificationController = require('./users/send-fcm');

// MFA - Authenticator
module.exports.AuthenticatorController = require('./account/authenticator/authenticator.controller');

// Invoice
module.exports.invoiceControllers = require('./invoice/invoice.controllers');

// oAuth
module.exports.oAuthController = require('./oauth/oauth.controller');
