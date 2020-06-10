const express = require('express');
const postRouter = express();
const PostController = require('../controllers/postController');

postRouter.get('/:id/details', PostController.getPostDetails);

postRouter.post('/:id/details', PostController.updatePostMessage);

module.exports = postRouter;
