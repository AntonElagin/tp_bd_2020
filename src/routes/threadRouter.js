const express = require('express');
const asyncHandler = require('express-async-handler');
const threadRouter = express.Router();
const ThreadController = require('../controllers/threadController');

threadRouter.post('/:key/create', asyncHandler(ThreadController.createPost));

threadRouter.get('/:key/details', asyncHandler(ThreadController.getThreadInfo));

threadRouter.post('/:key/details', asyncHandler(ThreadController.updateThread));

threadRouter.get('/:key/posts', asyncHandler(ThreadController.getThreadPosts));

threadRouter.post('/:key/vote', asyncHandler(ThreadController.vote));

module.exports = threadRouter;


