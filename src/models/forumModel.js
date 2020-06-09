const db = require('../modules/db-config');
const PQ = require('pg-promise').ParameterizedQuery;

module.exports = new class ForumModel {
  constructor() {
    this._db = db;
  }

  async createForum(forumData = {}, userData = {}) {
    try {
      const createForumQuery = new PQ(`INSERT INTO
       forums (slug, title, user_nickname, user_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *`);
      createForumQuery.values = [
        forumData.slug,
        forumData.title,
        userData.nickname,
        userData.id,
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

  async getForumDetails(forumSlug = '') {
    try {
      const detailForumQuery = new PQ(`Select * 
      from forums
      where slug = $1`, [forumSlug]);
      const result = await this._db.db.one(detailForumQuery);
      return {
        success: true,
        result,
      };
    } catch (err) {
      return {
        success: false,
        err,
      };
    }
  }

  async truncateAllForums() {
    try {
      const result = await this._dbContext.db.none(`TRUNCATE forums CASCADE`);
      return {
        success: true,
        result,
      };
    } catch (err) {
      return {
        success: false,
        err,
      };
    }
  }
};
