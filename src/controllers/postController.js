const Posts = require('../models/postModel');
const Users = require('../models/userModel');
const Threads = require('../models/threadModel');
const Forums = require('../models/forumModel');


class PostController {
  static async updatePostMessage(req, resp) {
    const id = req.params.id;
    const message = req.body.message;

    const postExist = await Posts.getPostById(id);

    if (postExist.success && !postExist.data) {
      return resp.status(404).json({
        message: `Can't find post with id ${id}`,
      });
    }

    if (!message) {
      return resp.status(200).json({
        author: postExist.data.author_nickname,
        created: postExist.data.created,
        forum: postExist.data.forum_slug,
        id: +postExist.data.id,
        message: postExist.data.message,
        thread: +postExist.data.thread_id,
      });
    }

    const updatedPost = await Posts.updatePostMessage(id, message);

    if (updatedPost.success) {
      if (updatedPost.data) {
        updatedPost.data.id = +updatedPost.data.id;
        updatedPost.data.thread = +updatedPost.data.thread;
        return resp.status(200).json(updatedPost.data);
      }
      return resp.status(200).json({
        author: postExist.data.author_nickname,
        created: postExist.data.created,
        forum: postExist.data.forum_slug,
        id: +postExist.data.id,
        message: postExist.data.message,
        thread: +postExist.data.thread_id,
      });
    }
    return resp.status(500).end();
  }

  static async getPostDetails(req, resp) {
    const id = req.params.id;
    let related = req.query.related ? req.query.related.split(',') : [];
    related = (Array.isArray(related)) ? related: [related];


    const postExist = await Posts.getPostById(id);

    if (!postExist.success) {
      return resp.status(500).end();
    }

    if (!postExist.data) {
      return resp.status(404).json({
        message: `Can't find post with id '${id}'\n`,
      });
    }
    const returnObj= {
      post: {
        author: postExist.data.author_nickname,
        created: postExist.data.created,
        forum: postExist.data.forum_slug,
        id: +postExist.data.id,
        isEdited: postExist.data.isedited,
        message: postExist.data.message,
        // parent: postExist.data.parent,
        thread: +postExist.data.thread_id,
      },
    };


    if (related) {
      for (const obj of related) {
        switch (obj) {
          case 'user':
            const author = await Users.getUserInfo(returnObj.post.author);

            if (!author.success) {
              return resp.status(500).end();
            }

            returnObj.author = {
              about: author.data.about,
              email: author.data.email,
              fullname: author.data.fullname,
              nickname: author.data.nickname,
            };
            break;
          case 'forum':
            const forum = await Forums.getForumDetails(returnObj.post.forum);

            if (!forum.success) {
              return resp.status(500).end();
            }

            returnObj.forum = {
              posts: forum.data.posts,
              slug: forum.data.slug,
              threads: forum.data.threads,
              title: forum.data.title,
              user: forum.data.user_nickname,
            };
            break;
          case 'thread':
            const thread =
              await Threads.getThreadById(postExist.data.thread_id);

            if (!thread.success) {
              return resp.status(500).end();
            }

            returnObj.thread = {
              author: thread.data.author_nickname,
              created: thread.data.created,
              forum: thread.data.forum_slug,
              id: +thread.data.id,
              slug: thread.data.slug,
              message: thread.data.message,
              title: thread.data.title,
              votes: +thread.data.votes,
            };
            break;
        }
      }
    }

    return resp.status(200).json(returnObj);
  }
}

module.exports = PostController;
