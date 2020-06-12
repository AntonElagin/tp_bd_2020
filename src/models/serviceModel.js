const db = require('../modules/db-config');

module.exports = new class ServiceModel {
  constructor() {
    this._db = db;
  }

  async deleteAll() {
    try {
      const data = await this._db.db.multi(`
      TRUNCATE votes, users, posts, threads, forums RESTART IDENTITY CASCADE
      `);
      return {
        success: true,
        data,
      };
    } catch (err) {
      console.error(`
      [Service] delete all error:
      ${err.message}
      `);
      return {
        success: false,
        err,
      };
    }
  }

  async getInfo() {
    try {
      const data = await this._db.db.multi(`
      Select count(*) as "forums" from forums;
      Select count(*) as "users" from users;
      Select count(*) as "threads" from threads;
      Select count(*) as "posts" from posts;
      `);
      return {
        success: true,
        data: {
          forum: +data[0][0].forums,
          user: +data[1][0].users,
          thread: +data[2][0].threads,
          post: +data[3][0].posts,
        },
      };
    } catch (err) {
      console.error(`
      [Service] Get stat error:
      ${err.message}
      `);
      return {
        success: false,
        err,
      };
    }
  }
};