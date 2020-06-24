
const PostController = require('../controllers/postController');


module.exports = function(fastify, opts, done) {
  fastify.get('/:id/details', PostController.getPostDetails);

  fastify.post('/:id/details', PostController.updatePostMessage);
  done();
};
