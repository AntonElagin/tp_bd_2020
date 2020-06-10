const Users = require('../models/userModel');
const Threads = require('../models/threadModel');
const Posts = require('../models/postModel');
const Forums = require('../models/forumModel');
const Votes = require('../models/voteModel');

class ThreadController {
  static async getThreadInfo(req, resp) {
    let id;
    let slug;
    if (/\d+/.test(req.params.key)) {
      id = req.params.key;
      slug = null;
    } else {
      slug = req.params.key;
      id = null;
    }

    const thread = await Threads.getThreadBySlugOrId(slug, id);

    if (thread.success) {
      if (!thread.data) {
        return resp.status(404).json({
          message: `Can't find thread with slug or id '${slug || id}'\n`,
        });
      }
      const data = thread.data;
      return resp.status(200).json({
        author: data.author_nickname,
        created: data.created,
        forum: data.forum_slug,
        id: data.id,
        message: data.message,
        slug: data.slug,
        title: data.title,
        votes: data.votes,
      });
    }

    return resp.status(500);
  }

  static async createPost(req, resp) {
    const posts = req.body;
    let id;
    let slug;
    if (/\d+/.test(req.params.key)) {
      id = req.params.key;
      slug = null;
    } else {
      slug = req.params.key;
      id = null;
    }

    posts.created = new Date();
    const threadExist = await Threads.getThreadBySlugOrId(slug, id);

    if (threadExist.success && !threadExist.data) {
      return resp.status(404).json({
        message: `Can't find thread with slug or id  '${slug || id}'\n`,
      });
    }

    for (const post of posts) {
      const postParent = await Posts.getPostById(post.parent);

      if (postParent.success && !postParent.data) {
        return resp.status(409).json({
          message: `Can't find parent post with id '${post.parent}'`,
        });
      }
    }

    const returnList = [];
    for (const post of posts) {
      const author = await Users.getUserInfo(post.author);

      if (!author.data) {
        return resp.status(404);
      }

      const postCreated = await Posts.createPost(
          author.data,
          threadExist.data, post,
      );

      if (!postCreated.data) {
        return resp.status(500);
      }

      const addedToForum = await Forums.addUserToForum(author.data, {
        id: threadExist.data.forum_id,
      });

      if (!addedToForum.success) {
        return resp.status(500);
      }

      returnList.push(postCreated.data);
    }

    const updatedThread =
     await Threads.updatePostsCount(threadExist.data.id, returnList.length);
    const updatedForum = await Forums.updatePostsCount(
        threadExist.data.forum_id,
        returnList.length,
    );

    if (!(updatedForum.success && updatedThread.success)) {
      return resp.status(500);
    }

    return resp.status(201).json(returnList);
  }

  static async updateThread(req, resp) {
    const thread = req.body;
    let id;
    let slug;
    if (/\d+/.test(req.params.key)) {
      id = req.params.key;
      slug = null;
    } else {
      slug = req.params.key;
      id = null;
    }

    const threadExist = await Threads.getThreadBySlugOrId(slug, id);

    if (threadExist.success) {
      if (!threadExist.data) {
        return resp.status(404).json({
          message: `Can't find thread with slug or id '${slug || id}'`,
        });
      }
    } else {
      return resp.status(500);
    }

    const updatedThread = await Threads.updateThread({
      ...thread,
      id: threadExist.data.id,
    });

    if (updatedThread.success) {
      return resp.status(200).json(updatedThread.data);
    }

    return resp.status(500);
  }


  static async vote(req, resp) {
    const vote = req.body;
    let id;
    let slug;
    if (/\d+/.test(req.params.key)) {
      id = req.params.key;
      slug = null;
    } else {
      slug = req.params.key;
      id = null;
    }

    const threadExist = await Threads.getThreadBySlugOrId(slug, id);

    if (threadExist.success) {
      if (!threadExist.data) {
        return resp.status(404).json({
          message: `Can't find thread with slug or id '${slug || id}'`,
        });
      }
    } else {
      return resp.status(500);
    }

    const voteUpdated = await Votes.createOrUpdateVote(
        threadExist.data,
        {nickname: vote.nickname},
        vote.voice);

    if (!voteUpdated.success) {
      return resp.status(500);
    }

    if (!voteUpdated.data) {
      return resp.status(200).json(threadExist.data);
    }

    const threadUpdated = await Threads.updatePostsCount(threadExist.data.id);

    if (!threadUpdated.success) {
      return resp.status(500);
    }

    return resp.status(200).json(threadUpdated.data);
  }

  static async getThreadPosts(req, resp) {
    return resp.status(500);
  }
}

module.exports = ThreadController;
