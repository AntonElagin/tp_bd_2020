const express = require('express');
const forumRouter = express.Router();
const forumController = require('../controllers/forumController');


forumRouter.post('/create', forumController.createForum);

forumRouter.post('/:slug/create', forumController.addThread);

forumRouter.get('/:slug/details', forumController.getForumDetails);

forumRouter.get('/:slug/threads', forumController.getForumThreads);

forumRouter.get('/:slug/users', forumController.getUsersOfForum);

module.exports = forumRouter;

