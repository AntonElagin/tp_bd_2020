const db = require('../modules/db-config').db;

module.exports = new class ThreadModel {
  constructor() {
    this.db = db;
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

  async updatePostsCount(id = -1, count = 1, db = this.db) {
    return await db.one(`UPDATE threads SET 
      posts = posts + $1
      WHERE id = $2
      RETURNING *`, [count, id]);
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
