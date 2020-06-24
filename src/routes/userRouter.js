const UserController = require('../controllers/userController');


module.exports = function(fastify, opts, done) {
  fastify.get('/:nickname/profile', UserController.getUser);

  fastify.post('/:nickname/profile', UserController.updateUser);

  fastify.post('/:nickname/create', UserController.createUser);
  done();
};
