const express = require('express');
const logger = require('morgan');

const app = express();

const userRouter = require('./routes/userRouter');
const forumRouter = require('./routes/forumRouter');
const threadRouter = require('./routes/threadRouter');
const postRouter = require('./routes/postRouter');
const serviceRouter = require('./routes/serviceRouter');

app.use(logger('dev'));
app.use(express.json());

app.use('/api/user', userRouter);
app.use('/api/forum', forumRouter);
app.use('/api/thread', threadRouter);
app.use('/api/post', postRouter);
app.use('/api/service', serviceRouter);

const port = process.env.PORT || 5000;
app.listen(
    port,
    () => console.log('Forum API server is running on port: ', port),
);
