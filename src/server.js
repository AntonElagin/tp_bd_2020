const lib = require('fastify');
const os = require('os');
const cluster =require('cluster');

const CPUS = os.cpus().length;

process.env.NODE_ENV = 'production';

const userRouter = require('./routes/userRouter');
const forumRouter = require('./routes/forumRouter');
const threadRouter = require('./routes/threadRouter');
const postRouter = require('./routes/postRouter');
const serviceRouter = require('./routes/serviceRouter');


const runCluster = () => {
  const fastify = lib();

  fastify.addContentTypeParser('application/json',
      {parseAs: 'string'}, function(req, body, done) {
        try {
          if (body) {
            const json = JSON.parse(body);
            done(null, json);
          } else {
            done(null, {});
          }
        } catch (err) {
          err.statusCode = 400;
          done(err, undefined);
        }
      });
  fastify.register(userRouter, {prefix: '/api/user'});
  fastify.register(forumRouter, {prefix: '/api/forum'});
  fastify.register(threadRouter, {prefix: '/api/thread'});
  fastify.register(postRouter, {prefix: '/api/post'});
  fastify.register(serviceRouter, {prefix: '/api/service'});

  const port = process.env.PORT || 5000;
  return fastify.listen(
      port, '0.0.0.0',
      (err, address) => {
        if (err) throw err;
        console.log('Forum API server is running on port: ', address);
      },
  );
};

if (cluster.isMaster) {
  for (let i = 0; i < CPUS; i++) {
    cluster.fork();
  }
} else {
  runCluster();
}
