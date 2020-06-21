const express = require('express');
const asyncHandler = require('express-async-handler');
const userRoutes = express.Router();
const UserController = require('../controllers/userController');

userRoutes.get('/:nickname/profile', asyncHandler(UserController.getUser));

userRoutes.post('/:nickname/profile', asyncHandler(UserController.updateUser));

userRoutes.post('/:nickname/create', asyncHandler(UserController.createUser));

module.exports = userRoutes;
