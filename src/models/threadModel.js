const db = require('../modules/db-config').db;
const Posts = require('./postModel');
// const Forums = require('./forumModel');

module.exports = new class ThreadModel {
  constructor() {
    this.db = db;
  }

  async updatePostsCount(slug = -1, count = 1, db = this.db) {
    return await db.one(`UPDATE forums SET 
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
            await Posts.createPost(post, t),
        );
      }

      await this.updatePostsCount(thread.forum, arr.length, t);

      return {
        status: 201,
        data: arr,
      };
    }).catch((err) => {
      console.log(err);
      if (err.message === 'parent error') {
        return {
          status: 409,
          data: {
            message: `Can't find forum by slug`,
          },
        };
      }
      if (err.constraint === 'posts_parent_fkey') {
        return {
          status: 404,
          data: {
            message: `Can't find forum by slug`,
          },
        };
      }
      if (err.constraint === 'posts_author_fkey') {
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

  async createThread(
      threadData = {}, forumData = {},
      userData= {}, db = this.db,
  ) {
    return await db.one(`INSERT INTO threads (
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


  createThreadAndOther(threadData = {}, forumData = {}, userData= {}) {
    return this.db.tx(
        async (t) => {
          const thread = await t.one(`
            INSERT INTO threads (
              slug, author, forum, 
              created, title, message) 
              VALUES ($1, $2, $3, $4, $5, $6) 
              RETURNING author, created, forum, id,
              message, title, slug;
            `, [
            threadData.slug,
            userData.nickname,
            forumData.slug,
            threadData.created,
            threadData.title,
            threadData.message,
          ]);

          await t.none(`
                UPDATE forums SET 
                  threads = threads + 1
                  WHERE slug = $1;
            `, [forumData.slug]);

          await t.none(`
                INSERT INTO forum_users (forum_slug, user_nickname)
                  VALUES ($1, $2)
                  ON CONFLICT DO NOTHING;
            `, [
            thread.forum,
            userData.nickname,
          ]);

          return thread;
        },
    );
  }

  async getThreadBySlugOrId(slug = '', id = -1, db = this.db) {
    if (slug) {
      return await this.getThreadBySlug(slug, db);
    } else {
      return await this.getThreadById(id, db);
    }
  }


  async getThreadBySlug(slug = '', db = this.db) {
    return await db.oneOrNone(`
    Select * from threads
    where slug = $1;
    `,
    [
      slug,
    ]);
  }

  async getThreadById(id = -1, db = this.db) {
    return await this.db.oneOrNone(`
    Select * from threads
    where id = $1;
    `,
    [
      id,
    ]);
  }


  async getForumThreads(
      forum = {}, {
        limit = 1000,
        since = null,
        desc = false,
        db = this.db,
      }) {
    if (since) {
      if (desc) {
        return await db.manyOrNone(`
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
        return await db.manyOrNone(`
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
      return await db.manyOrNone(`
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

  async updateThread(id, thread, db = this.db) {
    return await db.one(`Update threads
       set message = $1:raw , title = $2:raw
       where id = $3
       returning *;
      `, [
        (thread.message)? `'${thread.message}'` : 'message',
        (thread.title)? `'${thread.title}'` : 'title',
        id,
    ]);
  }


  async getUserAndThread(nickname ='', slug = '', id = -1, db = this.db) {
    return await db.multi(`
      Select * from users
        where nickname = $3;

      Select * from threads
        where slug = $1 or id = $2;
    `,
    [
      slug,
      id,
      nickname,
    ]);
  }
};
