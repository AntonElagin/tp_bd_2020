const express = require('express');
const userRoutes = express.Router();
const UserController = require('../controllers/userController');

userRoutes.get('/:nickname/profile', UserController.getUser);

userRoutes.post('/:nickname/profile', UserController.updateUser);

userRoutes.post('/:nickname/create', UserController.createUser);

module.exports = userRoutes;
