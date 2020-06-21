const Forums = require('../models/forumModel');

class ForumController {
  static async createForum(req, resp) {
    const forumData = req.body;

    const result = await Forums.createForumTx(forumData);

    switch (result.status) {
      case 409:
        const forum = result.data;
        return resp.status(409).json({
          slug: forum.slug,
          title: forum.title,
          user: forum.author,
        });
      case 201:
        const createdForum = result.data;
        return resp.status(201).json({
          slug: createdForum.slug,
          title: createdForum.title,
          user: createdForum.author,
        });
      default:
        return resp.status(result.status).json(result.data);
    }
  }

  static async getForumDetails(req, res) {
    const slug = req.params.slug;

    const forumExist = await Forums.getForumDetails(slug);
    if (!forumExist) {
      return res.status(404).json({
        message: `Can\'t find forum with slug '${slug}'\n`,
      });
    }

    res.json({
      slug: forumExist.slug,
      title: forumExist.title,
      user: forumExist.author,
      posts: forumExist.posts,
      threads: forumExist.threads,
    });
  }

  static async createThread(req, resp) {
    const slug = req.params.slug;
    const threadData = req.body;
    threadData.created = threadData.created || new Date();

    const result = await Forums.createThreadTx(slug, threadData);

    switch (result.status) {
      case 409:
      case 201:
        result.data.id = Number(result.data.id);
      default:
        return resp.status(result.status).json(result.data);
    }
  }

  static async getForumThreads(req, resp) {
    const getParams = req.query;
    if (getParams.desc) {
      getParams.desc = getParams.desc === 'true';
    }
    const slug = req.params.slug;

    const result = await Forums.getForumThreadsTx(slug, getParams);
    if (result.status === 200) {
      return resp.status(200).json(result.data.map((elem) => {
        elem.id = +elem.id;
        elem.votes = +elem.votes;
        return elem;
      }));
    }

    return resp.status(result.status).json(result.data);
  }

  static async getUsersOfForum(req, resp) {
    const getParams = req.query;
    getParams.desc = getParams.desc === 'true';
    const slug = req.params.slug;

    const result = await Forums.getUsersOfForumTx(slug, getParams);

    return resp.status(result.status).json(result.data);
  }
}

module.exports = ForumController;
