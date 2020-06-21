const express = require('express');
const asyncHandler = require('express-async-handler');
const postRouter = express.Router();
const PostController = require('../controllers/postController');

postRouter.get('/:id/details', asyncHandler(PostController.getPostDetails));

postRouter.post('/:id/details', asyncHandler(PostController.updatePostMessage));

module.exports = postRouter;
