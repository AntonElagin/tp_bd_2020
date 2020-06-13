const db = require('../modules/db-config');

module.exports = new class ForumModel {
  constructor() {
    this._db = db;
  }

  async createForum(forumData = {}, userData = {}) {
    try {
      const data = await this._db.db.one(`INSERT INTO
      forums (slug, title, author)
       VALUES ($1, $2, $3)
       RETURNING *`, [
        forumData.slug,
        forumData.title,
        userData.nickname,
      ]);
      return {
        success: true,
        data,
      };
    } catch (err) {
      console.error(`
      [Forums] Create forum error:
      ${err.message}
      `);

      return {
        success: false,
        err,
      };
    }
  }

  async getForumDetails(forumSlug = '') {
    try {
      const data = await this._db.db.oneOrNone(`Select * 
      from forums
      where slug = $1`, [
        forumSlug,
      ]);
      return {
        success: true,
        data,
      };
    } catch (err) {
      console.error(`
      [Forums] Get forum details error:
      ${err.message}
      `);


      return {
        success: false,
        err,
      };
    }
  }


  async checkForumAndUser(forumSlug = '', nickname = '') {
    try {
      const data = await this._db.db.multi(`
      Select * from users
      where nickname = $2;
      Select * 
      from forums
      where slug = $1;
      `, [
        forumSlug,
        nickname,
      ]);
      return {
        success: true,
        data: {
          user: data[0][0],
          forum: data[1][0],
        },
      };
    } catch (err) {
      console.error(`
      [Forums] Get forum details error:
      ${err.message}
      `);


      return {
        success: false,
        err,
      };
    }
  }


  async updateThreadCount(id = -1, count = 1) {
    try {
      const data = await this._db.db.oneOrNone(`UPDATE forums SET 
      threads = threads + $1
      WHERE id = $2
      RETURNING *`, [count, id]);
      return {
        success: true,
        data,
      };
    } catch (err) {
      console.error(`
      [Forums] Update threads count error:
      ${err.message}
      `);


      return {
        success: false,
        err,
      };
    }
  }

  async updatePostsCount(slug = -1, count = 1) {
    try {
      const data = await this._db.db.one(`UPDATE forums SET 
      posts = posts + $1
      WHERE slug = $2
      RETURNING *`, [count, slug]);
      return {
        success: true,
        data,
      };
    } catch (err) {
      console.error(`
      [Forums] Update posts count error:
      ${err.message}
      `);


      return {
        success: false,
        err,
      };
    }
  }

  async addUserToForum(user, forum) {
    try {
      const data = await this._db.db.oneOrNone(`
            INSERT INTO forum_users (forum_slug, user_id)
            VALUES ($1, $2)
            ON CONFLICT ON CONSTRAINT unique_user_in_forum
            DO NOTHING`,
      [
        forum.slug,
        user.id,
      ]);
      return {
        success: true,
        data,
      };
    } catch (err) {
      console.error(`
      [Forums] add User to forum error:
      ${err.message}
      `);


      return {
        success: false,
        err,
      };
    }
  }

  async addUsersToForum(dataArr) {
    try {
      const cs = new this._db.pgp.helpers.ColumnSet([
        'forum_slug',
        'user_id',
      ], {table: 'forum_users'});

      const insertQuery = this._db.pgp.helpers.insert(dataArr, cs) +
           'ON CONFLICT ON CONSTRAINT unique_user_in_forum DO NOTHING';

      const data = await this._db.db.manyOrNone(insertQuery);

      return {
        success: true,
        data,
      };
    } catch (err) {
      console.error(`
      [Forums] add Users to forum error:
      ${err.message}
      `);

      return {
        success: false,
        err,
      };
    }
  };
};

