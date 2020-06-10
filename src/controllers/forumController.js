const Forums = require('../models/forumModel');
const Users = require('../models/userModel');
const Threads = require('../models/threadModel');

class ForumController {
  static async createForum(req, resp) {
    const forumData = req.body;

    const userExist = await Users.getUserInfo(forumData.user);

    if ((userExist.success && !userExist.data)) {
      return resp.status(404).json({
        message: `Can't find user with nickname '${forumData.nickname}'\n`,
      });
    }
    const userData = userExist.data;

    const forumExist = await Forums.getForumDetails(forumData.slug);

    if (forumExist.success && forumExist.data) {
      return resp.status(409).json({
        slug: forumExist.data.slug,
        title: forumExist.data.title,
        user: forumExist.data.user_nickname,
      });
    }

    const createdForum = await Forums.createForum(forumData, userData);

    if (createdForum.success) {
      return resp.status(201).json({
        slug: createdForum.data.slug,
        title: createdForum.data.title,
        user: createdForum.data.user_nickname,
      });
    }

    return resp.status(500);
  }

  static async getForumDetails(req, res) {
    const slug = req.params.slug;

    const forumExist = await Forums.getForumDetails(slug);
    if (forumExist.success && !forumExist.data) {
      return res.status(404).json({
        message: `Can\'t find forum with slug '${slug}'\n`,
      });
    }

    res.json({
      slug: forumExist.slug,
      title: forumExist.title,
      user: forumExist.user_nickname,
      posts: forumExist.posts, threads: forumExist.threads,
    });
  }

  static async addThread(req, resp) {
    const slug = req.params.slug;
    const threadData = req.body;

    const user = await Users.getUserInfo(threadData.author);
    if (!(user.success && user.data)) {
      return resp.status(500);
    }

    const forum = await Forums.getForumDetails(slug);

    if (forum.success && !forum.data) {
      return resp.status(404).json({
        message: `Can't find forum with slug ${slug}\n`,
      });
    }

    const thread = await Threads.getThreadBySlugOrId(slug);

    if (thread.success && thread.data) {
      return resp.status(409).json(thread.data);
    }

    const threadCreated = await Threads.createThread(
        threadData,
        forum.data,
        user.data,
    );

    if (threadCreated.success) {
      const userAddedToForum = await Forums.addUserToForum(user, forum);
      const threadAddedToForumCount = await Forums.updateThreadCount(forum.id);

      if (userAddedToForum.success && threadAddedToForumCount.success) {
        return resp.status(201).json(threadCreated.data);
      }
    }

    return resp.status(500);
  }

  static async getForumThreads(req, resp) {
    const getParams = req.query;
    const slug = req.params.slug;

    const forum = await Forums.getForumDetails(slug);

    if (forum.success && !forum.data) {
      return resp.status(404).json({
        message: `Can't find forum with slug '${slug}'`,
      });
    }

    const threads = await Threads.getForumThreads(forum.data, getParams);
    if (threads.success) {
      return resp.status(200).json(threads.data);
    }

    return resp.status(500);
  }

  static async getUsersOfForum(req, resp) {
    const getParams = req.query;
    const slug = req.params.slug;

    const forumExist = await Forums.getForumDetails(slug);

    if (forumExist.success && !forumExist.data) {
      return resp.status(404).json({
        message: `Can't find forum with slug '${slug}'\n`,
      });
    }

    const users = await Users.getUsersByForum(forumExist.data, getParams);
    if (users.success) {
      return resp.status(200).json(users.data);
    }

    return resp.status(500);
  }
}

module.exports = ForumController;
