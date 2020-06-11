const express = require('express');
const threadRouter = express.Router();
const ThreadController = require('../controllers/threadController');

threadRouter.post('/:key/create', ThreadController.createPost);

threadRouter.get('/:key/details', ThreadController.getThreadInfo);

threadRouter.post('/:key/details', ThreadController.updateThread);

threadRouter.get('/:key/posts', ThreadController.getThreadPosts);

threadRouter.post('/:key/vote', ThreadController.vote);

module.exports = threadRouter;


