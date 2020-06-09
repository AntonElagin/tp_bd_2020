const express = require('express');
const logger = require('morgan');

const app = express();

const userRouter = require('./routes/userRoutes');
const forumRouter = require('./routes/forumRouter');

app.use(logger('dev'));
app.use(express.json());

// app.use('/api/', indexRouter);
app.use('/user', userRouter);
app.use('/forum', forumRouter);
// app.use('/api/thread', threadsRouter);
// app.use('/api/post', postsRouter);
// app.use('/api/service', serviceRouter);

const port = process.env.PORT || 5000;
app.listen(
    port,
    () => console.log('Forum API server is running on port: ', port),
);
