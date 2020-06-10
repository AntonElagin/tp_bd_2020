const db = require('../modules/db-config');
const PQ = require('pg-promise').ParameterizedQuery;

module.exports = new class UserModel {
  constructor() {
    this._db = db;
  }

  async createNewUser(userData) {
    try {
      const createUserQuery = new PQ(`
            Insert into users (nickname ,about, email, fullname)
            values ($1, $2, $3, $4) returning *;
          `, [
        userData.nuckname, userData.about,
        userData.email, userData.fullname,
      ]);
      const data = await this._db.db.one(createUserQuery);
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

  async getUserInfo(userNickname = '') {
    try {
      const getUserQuery = new PQ(`
        Select * from users
        where nickname = $1
      `, [userNickname]);
      const data = await this._db.db.one(getUserQuery);
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

  async updateUserProfile(nickname = '', userData = {}) {
    try {
      const condition = this._db.pgp.as.format(
          ' WHERE nickname = $1 Returning *',
          [
            nickname,
          ],
      );
      const updateUserQuery = this._db.pgp.helpers
          .update(userData, null, 'users') + condition;
      const data = await this._db.db.one(updateUserQuery);
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

  async getUserByNicknameOrEmail(nickname = '', email = '') {
    try {
      const getUserQuery = new PQ(`
        Select * from users
        where nickname = $1 or email = $2
      `, [nickname, email]);
      const data = await this._db.db.one(getUserQuery);
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

  async getUsersByForum(forum = {},
      {
        limit = 1000,
        since = '',
        desc = false,
      } = {}) {
    try {
      let data;
      if (since) {
        if (desc) {
          data =await this._db.db.many(`
        SELECT id, adout, email, fullname, nickname
        from users as u
        join forum_users as f ON u.id = f.user_id
        where f.forum_id = $1 AND nickname < $2
        order by nickname DESC
        limit $3
      `, [
            forum.id,
            since,
            +limit,
          ]);
        } else {
          data = await this._db.db.many(`
        SELECT id, adout, email, fullname, nickname
        from users as u
        join forum_users as f ON u.id = f.user_id
        where f.forum_id = $1 and nickname > $2
        order by nickname ASC
        limit $3
      `, [
            forum.id,
            since,
            +limit,
          ]);
        }
      } else {
        data = await this._db.db.many(`
          SELECT id, adout, email, fullname, nickname
          from users as u
          join forum_users as f ON u.id = f.user_id
          where f.forum_id = $1
          order by nickname $2:raw
          limit $3
        `, [
          forum.id,
           (desc) ? 'desc': 'asc',
           +limit]);
      }

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
