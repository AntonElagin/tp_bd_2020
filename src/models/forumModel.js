const db = require('../modules/db-config');

module.exports = new class ForumModel {
  constructor() {
    this._db = db;
  }

  async createForum(forumData = {}, userData = {}) {
    try {
      const data = await this._db.db.one(`INSERT INTO
      forums (slug, title, user_nickname, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`, [
        forumData.slug,
        forumData.title,
        userData.nickname,
        userData.id,
      ]);
      return {
        success: true,
        data,
      };
    } catch (err) {
      console.warn('Create forum error:\n'+ err.message);
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
      where slug = $1`, [forumSlug]);
      return {
        success: true,
        data,
      };
    } catch (err) {
      console.warn('get forum details error:\n'+ err.message);

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
      console.warn('update Thread count error:\n'+ err.message);

      return {
        success: false,
        err,
      };
    }
  }

  async updatePostsCount(id = -1, count = 1) {
    try {
      const data = await this._db.db.one(`UPDATE forums SET 
      posts = posts + $1
      WHERE id = $2
      RETURNING *`, [count, id]);
      return {
        success: true,
        data,
      };
    } catch (err) {
      console.warn('update Post count error:\n'+ err.message);

      return {
        success: false,
        err,
      };
    }
  }

  async addUserToForum(user, forum) {
    try {
      const data = await this._db.db.oneOrNone(`
            INSERT INTO forum_users (forum_id, user_id)
            VALUES ($1, $2)
            ON CONFLICT ON CONSTRAINT unique_user_in_forum
            DO NOTHING`,
      [
        forum.id,
        user.id,
      ]);
      return {
        success: true,
        data,
      };
    } catch (err) {
      console.warn('Add user to forum error:\n'+ err.message);

      return {
        success: false,
        err,
      };
    }
  }

  async addUsersToForum(dataArr) {
    try {
      const cs = new this._db.pgp.helpers.ColumnSet([
        'forum_id',
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
      console.warn('Add user to forum error:\n'+ err.message);

      return {
        success: false,
        err,
      };
    }
  };
};

