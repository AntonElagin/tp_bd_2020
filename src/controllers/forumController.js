const Forums = require('../models/forumModel');
const Users = require('../models/userModel');
const Threads = require('../models/threadModel');

class ForumController {
  static async createForum(req, resp) {
    const forumData = req.body;

    const checked = await Forums.checkForumAndUser(
        forumData.slug,
        forumData.user,
    );

    if (!checked.success) {
      return resp.status(500);
    }

    const user = checked.data.user;
    const forum = checked.data.forum;

    if (!user) {
      return resp.status(404).json({
        message: `Can't find user with nickname '${forumData.nickname}'\n`,
      });
    }

    if (forum) {
      return resp.status(409).json({
        slug: forum.slug,
        title: forum.title,
        user: forum.author,
      });
    }

    const createdForum = await Forums.createForum(forumData, user);

    if (createdForum.success) {
      return resp.status(201).json({
        slug: createdForum.data.slug,
        title: createdForum.data.title,
        user: createdForum.data.author,
      });
    }

    return resp.status(500).end();
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
      slug: forumExist.data.slug,
      title: forumExist.data.title,
      user: forumExist.data.author,
      posts: forumExist.data.posts,
      threads: forumExist.data.threads,
    });
  }

  static async addThread(req, resp) {
    const slug = req.params.slug;

    const threadData = req.body;

    const user = await Users.getUserInfo(threadData.author);
    if (!(user.success && user.data)) {
      return resp.status(404).json({
        message: `Can't find user with nickname ${threadData.author}\n`,
      });
    }

    const forum = await Forums.getForumDetails(slug);

    if (forum.success && !forum.data) {
      return resp.status(404).json({
        message: `Can't find forum with slug ${slug}\n`,
      });
    }

    const thread = await Threads.getThreadBySlug(threadData.slug);

    if (thread.success && thread.data) {
      return resp.status(409).json({
        author: thread.data.author,
        created: thread.data.created,
        forum: thread.data.forum,
        id: +thread.data.id,
        message: thread.data.message,
        slug: thread.data.slug,
        title: thread.data.title,
      });
    }

    threadData.created = threadData.created || new Date();
    const created = await Threads.createThreadAndOther(
        threadData,
        forum.data,
        user.data,
    );

    if (!created.success) {
      return resp.status(500).end();
    }
    const newThread = created.data;
    newThread.id = +newThread.id;
    return resp.status(201).json(newThread);
  }

  static async getForumThreads(req, resp) {
    const getParams = req.query;
    if (getParams.desc) {
      getParams.desc = getParams.desc === 'true';
    }
    const slug = req.params.slug;

    const forum = await Forums.getForumDetails(slug);

    if (forum.success && !forum.data) {
      return resp.status(404).json({
        message: `Can't find forum with slug '${slug}'`,
      });
    }

    const threads = await Threads.getForumThreads(forum.data, getParams);
    if (threads.success) {
      return resp.status(200).json(threads.data.map((elem) => {
        elem.id = +elem.id;
        elem.votes = + elem.votes;
        return elem;
      }));
    }

    return resp.status(500).end();
  }

  static async getUsersOfForum(req, resp) {
    const getParams = req.query;
    getParams.desc = getParams.desc === 'true';
    const slug = req.params.slug;

    const forumExist = await Forums.getForumDetails(slug);

    if (forumExist.success && !forumExist.data) {
      return resp.status(404).json({
        message: `Can't find forum with slug '${slug}'\n`,
      });
    }

    const users = await Users.getUsersByForum(forumExist.data, getParams);
    if (users.success) {
      return resp.status(200).json(users.data || []);
    }

    return resp.status(500).end();
  }
}

module.exports = ForumController;
