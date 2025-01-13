const Router = require('express').Router();
const FGGroupControllers = require('./FG-Group/controllers');

// FG Group
Router.get('/fg-group/orders', FGGroupControllers.getOrderInsightsController);
Router.get('/fg-group/invoice', FGGroupControllers.getInvoiceInsightsController);
Router.get('/fg-group/expense', FGGroupControllers.getExpenseInsightsController);
Router.get('/fg-group/users', FGGroupControllers.getUsersStatsController);
Router.get('/fg-group/students', FGGroupControllers.getStudentStatsController);

module.exports = Router;
