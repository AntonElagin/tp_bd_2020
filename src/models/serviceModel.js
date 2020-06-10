const db = require('../modules/db-config');

module.exports = new class ServiceModel {
  constructor() {
    this._db = db;
  }

  async deleteAll() {
    try {
      const data = await this._dbContext.db.none(`BEGIN;
      TRUNCATE forums CASCADE;
      TRUNCATE users CASCADE;
      TRUNCATE threads CASCADE;
      TRUNCATE posts CASCADE;
      TRUNCATE votes CASCADE;
      TRUNCATE forum_users CASCADE;
      COMMIT;`);
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

  async getInfo() {
    try {
      const data = await this._dbContext.db.none(`BEGIN;
      Select count(*) as 'forums' from forums;
      Select count(*) as 'users' from users;
      Select count(*) as 'threads' from threads;
      Select count(*) as 'posts' from posts;
      COMMIT;`);
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
