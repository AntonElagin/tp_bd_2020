const Users = require('../models/userModel');
const Threads = require('../models/threadModel');
const Posts = require('../models/postModel');
const Forums = require('../models/forumModel');
const Votes = require('../models/voteModel');

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

    const created = new Date();
    const threadExist = await Threads.getThreadBySlugOrId(slug, id);

    if (!threadExist) {
      return resp.status(404).json({
        message: `Can't find thread with slugx or id  '${slug || id}'\n`,
      });
    }

    if (posts.length === 0) {
      return resp.status(201).json([]);
    }

    const parentIdList = [];
    for (const post of posts) {
      if (post.parent) {
        parentIdList.push({
          thread_id: threadExist.id,
          id: post.parent,
        });
        const postParent = await Posts.getPostByIdAndThread(
            post.parent,
            threadExist,
        );

        if (!postParent) {
          return resp.status(409).json({
            message: `Can't find parent post with id '${post.parent}'`,
          });
        }


        if (!postParent) {
          return resp.status(500).end();
        }
      }
    }

    // const authorSet = new Set();
    // const addUsersList = [];
    for (const post of posts) {
      const author = await Users.getUserByNickname(post.author);

      if (!author) {
        return resp.status(404).json({
          message: `Can't find author with nickname '${post.author}'`,
        });
      }

      // // if (!authorSet.has(author.data.nickname)) {
      // //   addUsersList.push({
      // //     forum_slug: threadExist.data.forum,
      // //     user_nickname: author.data.nickname,
      // //   });

      // //   authorSet.add(author.data.nickname);
      // }
      post.created = created;
      post.author= author.nickname;
      post.forum = threadExist.forum;
      post.thread = threadExist.id;
      post.parent = post.parent || null;
    }

    const postsInsert = await Posts.createPosts(posts);

    if (!postsInsert) {
      return resp.status(500).end();
    }


    const updatedForum = await Forums.updatePostsCount(
        threadExist.forum,
        posts.length,
    );


    if (!(updatedForum)) {
      return resp.status(500).end();
    }

    return resp.status(201).json(postsTemplate(postsInsert));
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

    const threadExist = await Threads.getThreadBySlugOrId(slug, id);

    if (!threadExist) {
      return resp.status(404).json({
        message: `Can't find thread with id or slug '${slug || id}'`,
      });
    }


    let posts;
    switch (getParams.sort) {
      case 'parent_tree':
        posts = await Posts.getPostsbytThreadWithTreeWithParentSort(
            threadExist.id,
            getParams,
        );

        break;
      case 'tree':
        posts = await Posts.getPostsbytThreadWithTreeSort(
            threadExist.id,
            getParams,
        );

        break;
      case 'flat':
      default:
        posts = await Posts.getPostsbytThreadWithFlatSort(
            threadExist.id,
            getParams,
        );
    }

    if (!posts) {
      return resp.status(500).end();
    }

    if (posts && posts.length === 0 ) {
      return resp.status(200).json([]);
    }

    const returnArray = [];
    for (const post of posts) {
      returnArray.push({
        author: post.author,
        created: post.created,
        forum: post.forum,
        id: +post.id,
        isEdited: post.isedited,
        message: post.message,
        parent: +post.parent,
        thread: +post.thread,
      });
    }

    return resp.status(200).json(returnArray);
  }
}

module.exports = ThreadController;
