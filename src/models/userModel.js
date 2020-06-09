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
      const condition = this._db.pgp.as.format(' WHERE nickname = $1 Returning *', [nickname]);
      const updateUserQuery = this._db.pgp.helpers.update(userData, null, 'users') + condition;
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

  getUserByNicknameOrEmail(nickname = '', email = '') {
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
};
