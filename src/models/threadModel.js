const db = require('../modules/db-config');

module.exports = new class ThreadModel {
  constructor() {
    this._db = db;
  }

  async createThread(threadData = {}, forumData = {}, userData= {}) {
    {
      try {
        const data = await this._db.db.one(`INSERT INTO threads (
          slug, author, forum, 
          created, title, message) 
          VALUES ($1, $2, $3, $4, $5, $6) 
          RETURNING author_nickname as author, created, forum,
          id, message, title, slug;`,
        [
          threadData.slug,
          userData.nickname,
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
        console.error(`
      [Threads] Create thread error:
      ${err.message}
      `);
        return {
          success: false,
          err,
        };
      }
    }
  }


  async createThreadAndOther(threadData = {}, forumData = {}, userData= {}) {
    {
      try {
        const data = await this._db.db.multi(`
        INSERT INTO threads (
          slug, author, forum, 
          created, title, message) 
          VALUES ($1, $2, $3, $4, $5, $6) 
          RETURNING author, created, forum,
          id, message, title, slug;
        
        UPDATE forums SET 
          threads = threads + 1
          WHERE id = $8;
        
        INSERT INTO forum_users (forum_slug, user_id)
          VALUES ($3, $7)
          ON CONFLICT ON CONSTRAINT unique_user_in_forum
          DO NOTHING;         
          `,
        [
          threadData.slug,
          userData.nickname,
          forumData.slug,
          threadData.created,
          threadData.title,
          threadData.message,
          userData.id,
          forumData.id,
        ]);
        return {
          success: true,
          data: data[0][0],
        };
      } catch (err) {
        console.error(`
      [Threads] Create thread and other error:
      ${err.message}
      `);
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
      console.error(`
      [Threads] Get thread by slug or id error:
      ${err.message}
      `);
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
      console.error(`
      [Threads] Get thread by slug error:
      ${err.message}
      `);

      return {
        success: false,
        err,
      };
    }
  }

  async getThreadById(id = -1) {
    try {
      const data = await this._db.db.oneOrNone(`
    Select * from threads
    where id = $1;
    `,
      [
        id,
      ]);
      return {
        success: true,
        data,
      };
    } catch (err) {
      console.error(`
      [Threads] Get thread by id error:
      ${err.message}
      `);

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
          author, forum
          from threads
          where forum = $1 and created <= $2
          order by created DESC
          limit $3
        `,
          [
            forum.slug,
            since,
            limit,
          ]);
        } else {
          data = await this._db.db.manyOrNone(`
          Select created, id, message, slug, title ,
          author, forum
          from threads
          where forum = $1 and created >= $2
          order by created ASC
          limit $3
        `,
          [
            forum.slug,
            since,
            limit,
          ]);
        }
      } else {
        data = await this._db.db.manyOrNone(`
          Select created, id, message,
           slug, title ,
           author, forum
          from threads
          where forum = $1
          order by created $2:raw
          limit $3
        `,
        [
          forum.slug,
          (desc)? 'DESC': 'ASC',
          limit,
        ]);
      }
      return {
        success: true,
        data,
      };
    } catch (err) {
      console.error(`
      [Threads] Get threads of forum error:
      ${err.message}
      `);

      return {
        success: false,
        err,
      };
    }
  }

  async updateThread(id, thread) {
    try {
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
      console.error(`
      [Threads] update thread error:
      ${err.message}
      `);

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
      console.error(`
      [Threads] Update post count of thread error:
      ${err.message}
      `);

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
      console.error(`
      [Threads] Update votes count or thread error:
      ${err.message}
      `);

      return {
        success: false,
        err,
      };
    }
  }

  async getUserAndThread(nickname ='', slug = '', id = -1) {
    try {
      const data = await this._db.db.multi(`
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
      return {
        success: true,
        data: {
          user: data[0][0],
          thread: data[1][0],
        },
      };
    } catch (err) {
      console.error(`
      [Threads] Get thread by slug or id error:
      ${err.message}
      `);
      return {
        success: false,
        err,
      };
    }
  }
};
