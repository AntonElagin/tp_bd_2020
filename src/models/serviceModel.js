const db = require('../modules/db-config').db;

module.exports = new class ServiceModel {
  constructor() {
    this.db = db;
  }

  async deleteAll() {
    return await this.db.none(`
      TRUNCATE votes, users, posts, threads, forums RESTART IDENTITY CASCADE
      `);
  }

  async getInfo() {
    const data = await this.db.multi(`
      Select count(*) as "forums" from forums;
      Select count(*) as "users" from users;
      Select count(*) as "threads" from threads;
      Select count(*) as "posts" from posts;
      `);
    return {
      forum: +data[0][0].forums,
      user: +data[1][0].users,
      thread: +data[2][0].threads,
      post: +data[3][0].posts,
    };
  }
};
