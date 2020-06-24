const Threads = require('../models/threadModel');
const Votes = require('../models/voteModel');
// const Services = require('../models/serviceModel');

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
      return resp.code(404).send({
        message: `Can't find thread with slug or id '${slug || id}'\n`,
      });
    }
    const data = threadTemplate(thread);
    return resp.code(200).send(data);
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
      return resp.code(result.status).send(result.data);
    }

    // global.postsCount += result.length;
    // for (const id of global.postsCount) {
    //   global.postsCount.push(id.id);
    // }
    // if (global.postsCount.length > 1500000) {
    //   global.postsCount = [];
    //   Services.vacuum();
    // }

    return resp.code(201).send(postsTemplate(result));
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
      return resp.code(404).send({
        message: `Can't find thread with slug or id '${slug || id}'`,
      });
    }


    if (Object.keys(thread).length === 0) {
      return resp.code(200).send(threadTemplate(threadExist));
    }

    const updatedThread = await Threads.updateThread(
        threadExist.id,
        thread);

    if (updatedThread) {
      return resp.code(200).send(threadTemplate(updatedThread));
    }

    return resp.code(500).end();
  }


  static async vote(req, resp) {
    const vote = req.body;
    if (!((vote.voice === -1) || (vote.voice === 1))) {
      return resp.code(400).end();
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
        return resp.code(404).send(result.data);
      case 200:
        return resp.code(200).send(threadTemplate(result.data));
      case 500:
        return resp.code(500).end();
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

    return resp.code(result.status).send(result.data);
  }
}

module.exports = ThreadController;
