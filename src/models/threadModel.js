const db = require('../modules/db-config');
const PQ = require('pg-promise').ParameterizedQuery;

module.exports = new class ThreadModel {
  constructor() {
    this._db = db;
  }

  async createThread(threadData = {}, forumData = {}, userData= {}) {
    {
      try {
        const createForumQuery = new PQ(`INSERT INTO threads (
          slug, author_id, author_nickname, forum_id, forum_slug, 
          created, title, message) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
          RETURNING author_nickname as author, created, forum_slug as forum,
          id, message, title, votes;`);
        createForumQuery.values = [
          threadData.slug,
          userData.id,
          userData.nickname,
          forumData.id,
          forumData.slug,
          threadData.created,
          threadData.title,
          threadData.message,
        ];
        const data = await this._db.db.one(createForumQuery);
        return {
          success: true,
          data,
        };
      } catch (err) {
        console.warn('DB error:', err);
        return {
          success: false,
          err,
        };
      }
    }
  }

  async getThreadBySlugOrId(slug= '', id = -1) {
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
          data = await this._db.db.many(`
          Select * from threads
          where forum_id = $1 and created >= $2
          order by created DESC
          limit $3
        `,
          [
            forum.id,
            since,
            limit,
          ]);
        } else {
          data = await this._db.db.many(`
          Select * from threads
          where forum_id = $1 and created <= $2
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
        data = await this._db.db.many(`
          Select * from threads
          where forum_id = $1
          order by created $2:raw
          limit $3
        `,
        [
          forum.id,
          (desc)? 'DESC': 'ASC',
          limit,
        ]);
        return {
          success: true,
          data,
        };
      }
    } catch (err) {
      return {
        success: false,
        err,
      };
    }
  }

  async updateThread(thread) {
    try {
      const data = await this._db.db.one(`
        Update threads 
        set message = $1 , title = $2
        where id = $2
        Returning author_nickname as author,
        created, forum_slug as forum,
        id, message, slug, title, votes
      `, [
        thread.message,
        thread.title,
        thread.id,
      ]);

      return {
        success: true,
        data,
      };
    } catch (err) {
      return {
        success: false,
        err,
      };
    }
  }

  async updatePostsCount(id = -1, count = 1) {
    try {
      const updateThreadsQuery = new PQ(`UPDATE threads SET 
                posts = posts + $1
                WHERE id = $2
                RETURNING *`, [count, id]);
      const data = await this._db.db.one(updateThreadsQuery);
      return {
        success: true,
        data,
      };
    } catch (err) {
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
        SET votes = votes + $1
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
      return {
        success: false,
        err,
      };
    }
  }
};
