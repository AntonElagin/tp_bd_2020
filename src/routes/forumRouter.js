const express = require('express');
const forumRouter = express();


forumRouter.post('/create');

forumRouter.post('/:slug/create');

forumRouter.get('/:slug/details');

forumRouter.get('/:slug/threads');

forumRouter.get('/:slug/users');

module.exports = forumRouter;

