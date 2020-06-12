const Users = require('../models/userModel');
const Threads = require('../models/threadModel');
const Posts = require('../models/postModel');
const Forums = require('../models/forumModel');
const Votes = require('../models/voteModel');

const threadTemplate = (val) => {
  return {
    votes: Number(val.votes),
    author: val.author_nickname,
    created: val.created,
    forum: val.forum_slug,
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
      author: post.author_nickname,
      forum: post.forum_slug,
      created: post.created,
      thread: +post.thread_id,
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

    if (thread.success) {
      if (!thread.data) {
        return resp.status(404).json({
          message: `Can't find thread with slug or id '${slug || id}'\n`,
        });
      }
      const data = thread.data;
      return resp.status(200).json(
          threadTemplate(data),
      );
    }

    return resp.status(500).end();
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

    if (threadExist.success && !threadExist.data) {
      return resp.status(404).json({
        message: `Can't find thread with slugx or id  '${slug || id}'\n`,
      });
    }
    if (!threadExist.success) {
      return resp.status(500).end();
    }

    if (posts.length === 0) {
      return resp.status(201).json([]);
    }

    for (const post of posts) {
      if (post.parent) {
        const postParent = await Posts.getPostByIdAndThread(
            post.parent,
            threadExist.data,
        );

        console.log(postParent.data);
        if (postParent.success && !postParent.data) {
          return resp.status(409).json({
            message: `Can't find parent post with id '${post.parent}'`,
          });
        }


        if (!postParent.success) {
          return resp.status(500).end();
        }
      }
    }


    const returnList = [];
    for (const post of posts) {
      const author = await Users.getUserInfo(post.author);

      if (!author.data) {
        return resp.status(404).json({
          message: `Can't find author with nickname '${post.author}'`,
        });
      }


      post.created = created;
      post.author_id = author.data.id;
      post.author_nickname = author.data.nickname;
      post.forum_id = threadExist.data.forum_id;
      post.forum_slug = threadExist.data.forum_slug;
      post.thread_id = threadExist.data.id;
      post.thread_slug = threadExist.data.slug;
      post.parent = post.parent || null;

      // returnList.push({
      // id: +postData.id,
      // slug: postData.slug,
      // author: postData.author_nickname,
      // forum: postData.forum_slug,
      // created: postData.created,
      // thread: +postData.thread_id,
      // title: postData.title,
      // message: postData.message,
      // parent: +postData.parent,
      // });


      const addedToForum = await Forums.addUserToForum(author.data, {
        id: threadExist.data.forum_id,
      });

      if (!addedToForum.success) {
        return resp.status(500).end();
      }
    }

    const postsInsert = await Posts.createPosts(posts);

    if (!postsInsert.success) {
      return resp.status(500).end();
    }


    const updatedForum = await Forums.updatePostsCount(
        threadExist.data.forum_id,
        posts.length,
    );


    if (!(updatedForum.success)) {
      return resp.status(500).end();
    }

    return resp.status(201).json(postsTemplate(postsInsert.data));
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

    if (threadExist.success) {
      if (!threadExist.data) {
        return resp.status(404).json({
          message: `Can't find thread with slug or id '${slug || id}'`,
        });
      }
    } else {
      return resp.status(500).end();
    }

    if (Object.keys(thread).length === 0) {
      return resp.status(200).json(threadTemplate(threadExist.data));
    }

    const updatedThread = await Threads.updateThread(
        threadExist.data.id,
        thread);

    if (updatedThread.success) {
      return resp.status(200).json(threadTemplate(updatedThread.data));
    }

    return resp.status(500).end();
  }


  static async vote(req, resp) {
    const vote = req.body;
    let id;
    let slug;
    if (/^\d+$/.test(req.params.key)) {
      id = req.params.key;
      slug = null;
    } else {
      slug = req.params.key;
      id = null;
    }
    const userExist = await Users.getUserInfo(vote.nickname);

    if (userExist.success) {
      if (!userExist.data) {
        return resp.status(404).json({
          message: `Can't find user with nickname '${vote.nickname}'`,
        });
      }
    } else {
      return resp.status(500).end();
    }

    const threadExist = await Threads.getThreadBySlugOrId(slug, id);

    if (threadExist.success) {
      if (!threadExist.data) {
        return resp.status(404).json({
          message: `Can't find thread with slug or id '${slug || id}'`,
        });
      }
    } else {
      return resp.status(500).end();
    }

    const voteUpdated = await Votes.createOrUpdateVote(
        threadExist.data,
        {nickname: vote.nickname},
        vote.voice);

    if (!voteUpdated.success) {
      return resp.status(500).end();
    }

    // console.log(voteUpdated.data);
    // if (!voteUpdated.data) {
    //   console.log('kek\n\n');
    //   console.log(threadExist.data.votes + '\n\n');
    //   console.log(threadTemplate(threadExist.data).votes + '\n\n');
    //   return resp.status(200).json(threadTemplate(threadExist.data));
    // }

    // const threadUpdated = await Threads.updateVotesCount(
    //     threadExist.data,
    //     voteUpdated.data,
    // );

    // if (!threadUpdated.success) {
    //   return resp.status(500).end();
    // }

    // console.log(threadUpdated.data);
    // console.log(threadTemplate(threadUpdated.data));

    return resp.status(200).json(threadTemplate(voteUpdated.data));
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

    if (threadExist.success) {
      if (!threadExist.data) {
        return resp.status(404).json({
          message: `Can't find thread with id or slug '${slug || id}'`,
        });
      }
    } else {
      return resp.status(500).end();
    }

    let posts;
    switch (getParams.sort) {
      case 'parent_tree':
        posts = await Posts.getPostsbytThreadWithTreeWithParentSort(
            threadExist.data.id,
            getParams,
        );

        break;
      case 'tree':
        posts = await Posts.getPostsbytThreadWithTreeSort(
            threadExist.data.id,
            getParams,
        );

        break;
      case 'flat':
      default:
        console.log(threadExist.id);
        console.log(getParams);
        posts = await Posts.getPostsbytThreadWithFlatSort(
            threadExist.data.id,
            getParams,
        );
    }

    if (!posts.success) {
      return resp.status(500).end();
    }

    console.log(posts);
    if (posts.data && posts.data.length === 0 ) {
      return resp.status(200).json([]);
    }

    const returnArray = [];
    for (const post of posts.data) {
      returnArray.push({
        author: post.author_nickname,
        created: post.created,
        forum: post.forum_slug,
        id: +post.id,
        isEdited: post.isedited,
        message: post.message,
        parent: +post.parent,
        thread: +post.thread_id,
      });
    }

    return resp.status(200).json(returnArray);
  }
}

module.exports = ThreadController;
