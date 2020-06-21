const Posts = require('../models/postModel');
const Users = require('../models/userModel');
const Threads = require('../models/threadModel');
const Forums = require('../models/forumModel');


class PostController {
  static async updatePostMessage(req, resp) {
    const id = req.params.id;
    const message = req.body.message;

    const postExist = await Posts.getPostById(id);

    if (!postExist) {
      return resp.status(404).json({
        message: `Can't find post with id ${id}`,
      });
    }

    if (!message) {
      return resp.status(200).json({
        author: postExist.author,
        created: postExist.created,
        forum: postExist.forum,
        id: +postExist.id,
        message: postExist.message,
        thread: +postExist.thread,
      });
    }

    const updatedPost = await Posts.updatePostMessage(id, message);

    if (updatedPost) {
      updatedPost.id = +updatedPost.id;
      updatedPost.thread = +updatedPost.thread;
      return resp.status(200).json(updatedPost);
    }
    return resp.status(200).json({
      author: postExist.author,
      created: postExist.created,
      forum: postExist.forum,
      id: +postExist.id,
      message: postExist.message,
      thread: +postExist.thread,
    });
    // return resp.status(500).end();
  }

  static async getPostDetails(req, resp) {
    const id = req.params.id;
    let related = req.query.related ? req.query.related.split(',') : [];
    related = (Array.isArray(related)) ? related: [related];


    const postExist = await Posts.getPostById(id);


    if (!postExist) {
      return resp.status(404).json({
        message: `Can't find post with id '${id}'\n`,
      });
    }
    const returnObj= {
      post: {
        author: postExist.author,
        created: postExist.created,
        forum: postExist.forum,
        id: +postExist.id,
        isEdited: postExist.isedited,
        message: postExist.message,
        thread: +postExist.thread,
        parent: +postExist.parent,
      },
    };


    if (related) {
      for (const obj of related) {
        switch (obj) {
          case 'user':
            const author = await Users.getUserByNickname(returnObj.post.author);


            returnObj.author = {
              about: author.about,
              email: author.email,
              fullname: author.fullname,
              nickname: author.nickname,
            };
            break;
          case 'forum':
            const forum = await Forums.getForumDetails(returnObj.post.forum);

            if (!forum) {
              return resp.status(500).end();
            }

            returnObj.forum = {
              posts: forum.posts,
              slug: forum.slug,
              threads: forum.threads,
              title: forum.title,
              user: forum.author,
            };
            break;
          case 'thread':
            const thread =
              await Threads.getThreadById(postExist.thread);

            if (!thread) {
              return resp.status(500).end();
            }

            returnObj.thread = {
              author: thread.author,
              created: thread.created,
              forum: thread.forum,
              id: +thread.id,
              slug: thread.slug,
              message: thread.message,
              title: thread.title,
              votes: +thread.votes,
            };
            break;
        }
      }
    }

    return resp.status(200).json(returnObj);
  }
}

module.exports = PostController;
