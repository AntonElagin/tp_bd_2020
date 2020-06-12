const express = require('express');
const serviceRouter = express.Router();
const ServiceController = require('../controllers/serviceController');

serviceRouter.get('/status', ServiceController.getInfo);

serviceRouter.post('/clear', ServiceController.deleteAll);

module.exports = serviceRouter;