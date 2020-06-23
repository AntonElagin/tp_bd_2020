const express = require('express');
// const logger = require('morgan');

process.env.NODE_ENV = 'production';

const userRouter = require('./routes/userRouter');
const forumRouter = require('./routes/forumRouter');
const threadRouter = require('./routes/threadRouter');
const postRouter = require('./routes/postRouter');
const serviceRouter = require('./routes/serviceRouter');


const cluster = require('express-cluster');

cluster(function(worker) {
  const app = express();

  // app.use(logger('dev'));
  app.use(express.json());

  app.use('/api/user', userRouter);
  app.use('/api/forum', forumRouter);
  app.use('/api/thread', threadRouter);
  app.use('/api/post', postRouter);
  app.use('/api/service', serviceRouter);

  const port = process.env.PORT || 5000;
  return app.listen(
      port,
      () => console.log('Forum API server is running on port: ', port),
  );
}, {respawn: false});
