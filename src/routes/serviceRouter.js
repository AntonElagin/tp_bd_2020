const ServiceController = require('../controllers/serviceController');


module.exports = function(fastify, opts, done) {
  fastify.get('/status', ServiceController.getInfo);

  fastify.post('/clear', ServiceController.deleteAll);

  done();
};
