const Threads = require('../models/threadModel');
const Votes = require('../models/voteModel');
const Services = require('../models/serviceModel');

const threadTemplate = (val) => {
  return {
    votes: Number(val.votes),
    author: val.author,
    created: val.created,
    forum: val.forum,
    id: Number(val.id),
    message: val.message,
    slug: val.slug,
    title: val.title,
  };
};

const postsTemplate = (arr) => {
  const posts = [];
  for (const post of arr) {
    posts.push({
      id: +post.id,
      slug: post.slug,
      author: post.author,
      forum: post.forum,
      created: post.created,
      thread: +post.thread,
      title: post.title,
      message: post.message,
      parent: +post.parent,
    });
  }
  return posts;
};


class ThreadController {
  static async getThreadInfo(req, resp) {
    let id;
    let slug;

    if (/^\d+$/.test(req.params.key)) {
      id = req.params.key;
      slug = null;
    } else {
      slug = req.params.key;
      id = null;
    }

    const thread = await Threads.getThreadBySlugOrId(slug, id);


    if (!thread) {
      return resp.status(404).json({
        message: `Can't find thread with slug or id '${slug || id}'\n`,
      });
    }
    const data = threadTemplate(thread);
    return resp.status(200).send(data);
  }

  static async createPost(req, resp) {
    const posts = req.body;
    let id;
    let slug;
    if (/^\d+$/.test(req.params.key)) {
      id = req.params.key;
      slug = null;
    } else {
      slug = req.params.key;
      id = null;
    }

    const result = await Threads.createPostsTx(slug, id, posts);


    if (result.status) {
      return resp.status(result.status).json(result.data);
    }

    // global.postsCount += result.length;
    // for (const id of global.postsCount) {
    //   global.postsCount.push(id.id);
    // }
    // if (global.postsCount.length > 1500000) {
    //   global.postsCount = [];
    //   Services.vacuum();
    // }

    return resp.status(201).json(postsTemplate(result));
  }

  static async updateThread(req, resp) {
    const thread = req.body;

    let id;
    let slug;
    if (/^\d+$/.test(req.params.key)) {
      id = req.params.key;
      slug = null;
    } else {
      slug = req.params.key;
      id = null;
    }


    const threadExist = await Threads.getThreadBySlugOrId(slug, id);

    if (!threadExist) {
      return resp.status(404).json({
        message: `Can't find thread with slug or id '${slug || id}'`,
      });
    }


    if (Object.keys(thread).length === 0) {
      return resp.status(200).json(threadTemplate(threadExist));
    }

    const updatedThread = await Threads.updateThread(
        threadExist.id,
        thread);

    if (updatedThread) {
      return resp.status(200).json(threadTemplate(updatedThread));
    }

    return resp.status(500).end();
  }


  static async vote(req, resp) {
    const vote = req.body;
    if (!((vote.voice === -1) || (vote.voice === 1))) {
      return resp.status(400).end();
    }

    let id;
    let slug;
    if (/^\d+$/.test(req.params.key)) {
      id = req.params.key;
      slug = null;
    } else {
      slug = req.params.key;
      id = null;
    }


    const result = await Votes.createOrUpdateVote(
        vote.nickname,
        slug,
        id,
        vote.voice,
    );

    switch (result.status) {
      case 404:
        return resp.status(404).json(result.data);
      case 200:
        return resp.status(200).json(threadTemplate(result.data));
      case 500:
        return resp.status(500).end();
    }
  }

  static async getThreadPosts(req, resp) {
    const getParams = req.query;
    getParams.desc = getParams.desc === 'true';
    let id;
    let slug;
    if (/^\d+$/.test(req.params.key)) {
      id = req.params.key;
      slug = null;
    } else {
      slug = req.params.key;
      id = null;
    }

    const result = await Threads.getThreadPostsTx(slug, id, getParams);

    return resp.status(result.status).json(result.data);
  }
}

module.exports = ThreadController;
