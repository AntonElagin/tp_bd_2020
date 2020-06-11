const db = require('../modules/db-config');

module.exports = new class ThreadModel {
  constructor() {
    this._db = db;
  }

  async createThread(threadData = {}, forumData = {}, userData= {}) {
    {
      try {
        const data = await this._db.db.one(`INSERT INTO threads (
          slug, author_id, author_nickname, forum_id, forum_slug, 
          created, title, message) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
          RETURNING author_nickname as author, created, forum_slug as forum,
          id, message, title, slug;`,
        [
          threadData.slug,
          userData.id,
          userData.nickname,
          forumData.id,
          forumData.slug,
          threadData.created,
          threadData.title,
          threadData.message,
        ]);
        return {
          success: true,
          data,
        };
      } catch (err) {
        console.warn('Create Thread error:', err);
        return {
          success: false,
          err,
        };
      }
    }
  }

  async getThreadBySlugOrId(slug = '', id = -1) {
    try {
      const data = await this._db.db.oneOrNone(`
    Select * from threads
    where slug = $1 or id = $2;
    `,
      [
        slug,
        id,
      ]);
      return {
        success: true,
        data,
      };
    } catch (err) {
      console.warn('get thread by slug or id error:\n', err);

      return {
        success: false,
        err,
      };
    }
  }


  async getThreadBySlug(slug = '') {
    try {
      const data = await this._db.db.oneOrNone(`
    Select * from threads
    where slug = $1;
    `,
      [
        slug,
      ]);
      return {
        success: true,
        data,
      };
    } catch (err) {
      console.warn('get thread by slug or id error:', err);

      return {
        success: false,
        err,
      };
    }
  }


  async getForumThreads(
      forum = {}, {
        limit = 1000,
        since = null,
        desc = false,
      }) {
    try {
      let data;
      if (since) {
        if (desc) {
          data = await this._db.db.manyOrNone(`
          Select created, id, message, slug, title ,
          author_nickname as author, forum_slug as forum
          from threads
          where forum_id = $1 and created <= $2
          order by created DESC
          limit $3
        `,
          [
            forum.id,
            since,
            limit,
          ]);
        } else {
          data = await this._db.db.manyOrNone(`
          Select created, id, message, slug, title ,
          author_nickname as author, forum_slug as forum
          from threads
          where forum_id = $1 and created >= $2
          order by created ASC
          limit $3
        `,
          [
            forum.id,
            since,
            limit,
          ]);
        }
      } else {
        data = await this._db.db.manyOrNone(`
          Select created, id, message, slug, title ,
          author_nickname as author, forum_slug as forum
          from threads
          where forum_id = $1
          order by created $2:raw
          limit $3
        `,
        [
          forum.id,
          (desc)? 'DESC': 'ASC',
          limit,
        ]);
      }
      return {
        success: true,
        data,
      };
    } catch (err) {
      console.warn('get forum Thread error:', err);

      return {
        success: false,
        err,
      };
    }
  }

  async updateThread(id, thread) {
    try {
      // const data = await this._db.db.one(`
      //   Update threads
      //   set message = $1 , title = $2
      //   where id = $3
      //   Returning *
      // `, [
      //   thread.message,
      //   thread.title,
      //   thread.id,
      // ]);

      const condition = this._db.pgp.as.format(
          ' WHERE id = $1 Returning *',
          [
            id,
          ],
      );
      const updateUserQuery = this._db.pgp.helpers
          .update(thread, null, 'threads') + condition;
      const data = await this._db.db.one(updateUserQuery);
      return {
        success: true,
        data,
      };
    } catch (err) {
      console.warn('update Thread error:', err);

      return {
        success: false,
        err,
      };
    }
  }

  async updatePostsCount(id = -1, count = 1) {
    try {
      const data = await this._db.db.one(`UPDATE threads SET 
      posts = posts + $1
      WHERE id = $2
      RETURNING *`, [count, id]);
      return {
        success: true,
        data,
      };
    } catch (err) {
      console.warn('update post count error:', err);

      return {
        success: false,
        err,
      };
    }
  }

  async updateVotesCount(thread, count = 1) {
    try {
      const data = await this._db.db.one(`
        Update threads
        SET votes = $1
        where id = $2
        returning *
      `, [
        count,
        thread.id,
      ]);

      return {
        success: true,
        data,
      };
    } catch (err) {
      console.warn('update votes count error:', err);

      return {
        success: false,
        err,
      };
    }
  }
};
