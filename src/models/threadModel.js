const db = require('../modules/db-config').db;
const Posts = require('./postModel');
// const Forums = require('./forumModel');

module.exports = new class ThreadModel {
  constructor() {
    this.db = db;
  }

  getThreadPostsTx(slug, id, getParams) {
    return this.db.tx(async (t) => {
      const thread = await this.getThreadBySlugOrId(slug, id, t);

      if (!thread) {
        return {
          status: 404,
          data: {
            message: `Can't find thread with slug or id '${slug || id}'\n`,
          },
        };
      }

      getParams.db = t;
      let posts;
      switch (getParams.sort) {
        case 'parent_tree':
          posts = await Posts.getPostsbytThreadWithTreeWithParentSort(
              thread.id,
              getParams,
          );

          break;
        case 'tree':
          posts = await Posts.getPostsbytThreadWithTreeSort(
              thread.id,
              getParams,
          );

          break;
        case 'flat':
        default:
          posts = await Posts.getPostsbytThreadWithFlatSort(
              thread.id,
              getParams,
          );
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

      return {
        status: 200,
        data: returnArray,
      };
    });
  }


  updatePostsCount(slug = -1, count = 1, db = this.db) {
    return db.one(`UPDATE forums SET 
      posts = posts + $1
      WHERE slug = $2
      RETURNING *`, [count, slug]);
  }

  createPostsTx(slug, id, posts) {
    return this.db.task(async (t) => {
      const thread = await this.getThreadBySlugOrId(slug, id, t);

      if (!thread) {
        return {
          status: 404,
          data: {
            message: `Can't find thread with id or slug '${slug || id}'\n`,
          },
        };
      }

      if (posts.length === 0) {
        return {
          status: 201,
          data: [],
        };
      }

      const arr = [];
      const created = new Date();
      for (const post of posts) {
        post.created = created;
        post.forum = thread.forum;
        post.thread = thread.id;
        arr.push(
            Posts.createPost(post, t),
        );
      }

      await this.updatePostsCount(thread.forum, arr.length, t);

      return t.batch(arr);
    }).catch((err) => {
      console.log(err);
      if (err.first.message === 'parent error') {
        return {
          status: 409,
          data: {
            message: `Can't find forum by slug`,
          },
        };
      }
      if (err.first.constraint === 'posts_parent_fkey') {
        return {
          status: 404,
          data: {
            message: `Can't find forum by slug`,
          },
        };
      }
      if (err.first.constraint === 'posts_author_fkey') {
        return {
          status: 404,
          data: {
            message: `Can't find forum by slug`,
          },
        };
      }
      return {
        status: 500,
        data: err,
      };
    });
  }

  createThread(
      threadData = {}, forumData = {},
      userData= {}, db = this.db,
  ) {
    return db.one(`INSERT INTO threads (
          slug, author, forum, 
          created, title, message) 
          VALUES ($1, $2, $3, $4, $5, $6) 
          RETURNING author, created, forum,
          id, message, title, slug;`,
    [
      threadData.slug,
      userData.nickname,
      forumData.slug,
      threadData.created,
      threadData.title,
      threadData.message,
    ]);
  }


  getThreadBySlugOrId(slug = '', id = -1, db = this.db) {
    if (slug) {
      return this.getThreadBySlug(slug, db);
    } else {
      return this.getThreadById(id, db);
    }
  }


  getThreadBySlug(slug = '', db = this.db) {
    return db.oneOrNone(`
    Select * from threads
    where slug = $1;
    `,
    [
      slug,
    ]);
  }

  getThreadById(id = -1, db = this.db) {
    return this.db.oneOrNone(`
    Select * from threads
    where id = $1;
    `,
    [
      id,
    ]);
  }


  getForumThreads(
      forum = {}, {
        limit = 1000,
        since = null,
        desc = false,
        db = this.db,
      }) {
    if (since) {
      if (desc) {
        return db.manyOrNone(`
          SELECT created, id, message,
            slug, title , author,
            forum, votes
          FROM threads
          WHERE forum = $1 AND created <= $2
          ORDER BY created DESC
          LIMIT $3
        `,
        [
          forum.slug,
          since,
          limit,
        ]);
      } else {
        return db.manyOrNone(`
          SELECT created, id, message,
           slug, title, author,
           forum, votes
          FROM threads
          WHERE forum = $1 AND created >= $2
          ORDER BY created ASC
          LIMIT $3
        `,
        [
          forum.slug,
          since,
          limit,
        ]);
      }
    } else {
      return db.manyOrNone(`
          SELECT created, id, message,
           slug, title, author,
           forum, votes
          FROM threads
          WHERE forum = $1
          ORDER BY created $2:raw
          LIMIT $3
        `,
      [
        forum.slug,
          (desc)? 'DESC': 'ASC',
          limit,
      ]);
    }
  }

  updateThread(id, thread, db = this.db) {
    return db.one(`Update threads
       set message = $1:raw , title = $2:raw
       where id = $3
       returning *;
      `, [
        (thread.message)? `'${thread.message}'` : 'message',
        (thread.title)? `'${thread.title}'` : 'title',
        id,
    ]);
  }
};
