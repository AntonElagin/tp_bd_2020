const ThreadController = require('../controllers/threadController');

module.exports = function(fastify, opts, done) {
  fastify.post('/:key/create', ThreadController.createPost);

  fastify.get('/:key/details', ThreadController.getThreadInfo);

  fastify.post('/:key/details', ThreadController.updateThread);

  fastify.get('/:key/posts', ThreadController.getThreadPosts);

  fastify.post('/:key/vote', ThreadController.vote);
  done();
};
