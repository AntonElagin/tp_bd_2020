const Posts = require('../models/postModel');


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

    const result = await Posts.getPostDetailsTx(id, related);

    if (result.status) {
      return resp.status(result.status).json(result.data);
    }


    const returnO = {};

    const arr = result[result.length - 1];
    for (let i = 0; i < arr.length; i++) {
      switch (arr[i]) {
        case 'thread':
          result[i].id = +result[i].id;
          result[i].votes = +result[i].votes;
          break;
        case 'forum':
          result[i].posts = +result[i].posts;
          result[i].user = result[i].author;
          delete(result[i].author);
          result[i].threads = +result[i].threads;
          break;
      }
      returnO[arr[i]] = result[i];
    }

    return resp.status(200).json(returnO);
  }
}

module.exports = PostController;
