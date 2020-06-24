const forumController = require('../controllers/forumController');


module.exports = function(fastify, opts, done) {
  fastify.post('/create', forumController.createForum);

  fastify.post('/:slug/create', forumController.createThread);

  fastify.get('/:slug/details', forumController.getForumDetails);

  fastify.get('/:slug/threads', forumController.getForumThreads);

  fastify.get('/:slug/users', forumController.getUsersOfForum);
  done();
};

