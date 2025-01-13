/**
 * @author Brijesh Prajapati
 * @description Routing to Controller for Incoming Request for /admin/v1
 */

const adminRoute = require('express').Router();

// -- Controllers --
const { adminControllers: controller, fileUploadController } = require('../controllers');
const { DeleteGeneralCache } = require('../controllers/cache-manager');

// -- Middleware --
const { adminAuthenticationMiddleware } = require('../middleware');

// -- Routes --

// Account
// adminRoute.post('/create', controller.createAccountController);
adminRoute.post('/login', controller.loginController);
adminRoute.post('/login-with-otp', controller.loginWithOTPController.Login);
adminRoute.post('/login-with-otp/verify', controller.loginWithOTPController.VerifyOTP);
adminRoute.post('/oauth', controller.oAuthController);

// Account
adminRoute.post('/create-admin', controller.createAccountController);

// * Middleware
adminRoute.use(adminAuthenticationMiddleware);

// -- Authorized Routes --

// Insights
adminRoute.use('/insights', require('../controllers/insights/insights.routes'));

// Account
adminRoute.get('/get-profile', controller.getProfileController);
adminRoute.post('/update-profile', controller.updateProfileController);
adminRoute.post('/change-password', controller.changePasswordController);
adminRoute.get('/get-universal-token', controller.getUniversalAccessController);

// Account
adminRoute.post('/admin-user/reset-password', controller.resetSubAdminPasswordController);
adminRoute.get('/admin-user/get-admin', controller.getAdminController);
adminRoute.post('/admin-user/remove-admin', controller.removeSubAdminPasswordController);
adminRoute.post('/admin-user/update-profile', controller.updateAdminProfileController);

// File Upload
adminRoute.post('/file-upload', fileUploadController);

// Users
adminRoute.get('/user/get', controller.getUserController);
adminRoute.post('/user/update', controller.updateUserController);
adminRoute.post('/user/lock', controller.unlockUserController);
adminRoute.post('/user/remove', controller.removeUserController);
adminRoute.post('/user/create', controller.createUserController);
adminRoute.get('/user/get-student-user', controller.getStudentUserController);
adminRoute.post('/user/send-fcm-notification', controller.sendFCMNotificationController);

// MFA - Authenticator
adminRoute.post('/mfa/authenticator/add-secret', controller.AuthenticatorController.addSecret);
adminRoute.post('/mfa/authenticator/remove-secret', controller.AuthenticatorController.removeSecret);

// Cache Manager
adminRoute.delete('/cache-manager/general-cache', DeleteGeneralCache);

// Invoice
adminRoute.post('/invoice/create', controller.invoiceControllers.createInvoice);
adminRoute.get('/invoice/get-next-invoice', controller.invoiceControllers.getNextInvoiceSequence);
adminRoute.get('/invoice/get', controller.invoiceControllers.getInvoice);
adminRoute.post('/invoice/update', controller.invoiceControllers.updateInvoice);
adminRoute.delete('/invoice/delete', controller.invoiceControllers.deleteInvoice);
adminRoute.get('/invoice/stats', controller.invoiceControllers.getStats);

module.exports = adminRoute;
