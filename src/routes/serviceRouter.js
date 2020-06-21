const express = require('express');
const asyncHandler = require('express-async-handler');
const serviceRouter = express.Router();
const ServiceController = require('../controllers/serviceController');

serviceRouter.get('/status', asyncHandler(ServiceController.getInfo));

serviceRouter.post('/clear', asyncHandler(ServiceController.deleteAll));

module.exports = serviceRouter;
