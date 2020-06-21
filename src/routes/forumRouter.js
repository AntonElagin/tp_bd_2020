const express = require('express');
const asyncHandler = require('express-async-handler');
const forumRouter = express.Router();
const forumController = require('../controllers/forumController');


forumRouter.post('/create', asyncHandler(forumController.createForum));

forumRouter.post('/:slug/create', asyncHandler(forumController.createThread));

forumRouter.get('/:slug/details', asyncHandler(forumController.getForumDetails));

forumRouter.get('/:slug/threads', asyncHandler(forumController.getForumThreads));

forumRouter.get('/:slug/users', asyncHandler(forumController.getUsersOfForum));

module.exports = forumRouter;

