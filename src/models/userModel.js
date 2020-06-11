const db = require('../modules/db-config');

module.exports = new class UserModel {
  constructor() {
    this._db = db;
  }

  async createNewUser(userData) {
    try {
      const data = await this._db.db.one(`
      Insert into users (nickname ,about, email, fullname)
      values ($1, $2, $3, $4) returning *;
    `, [
        userData.nickname, userData.about,
        userData.email, userData.fullname,
      ]);
      return {
        success: true,
        data,
      };
    } catch (err) {
      console.warn('Create user error!' + err.message);
      return {
        success: false,
        err,
      };
    }
  }

  async getUserInfo(userNickname = '') {
    try {
      const data = await this._db.db.oneOrNone(`
      Select * from users
      where nickname = $1
    `, [userNickname]);
      return {
        success: true,
        data,
      };
    } catch (err) {
      console.warn('Get user error!\n' + err.message);
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
      console.warn('Update user error!\n' + err.message);

      return {
        success: false,
        err,
      };
    }
  }

  async getUserByNicknameOrEmail(nickname = '', email = '') {
    try {
      const data = await this._db.db.manyOrNone(`
      Select nickname, fullname, about, email from users
      where nickname = $1 or email = $2
    `, [nickname, email]);
      return {
        success: true,
        data,
      };
    } catch (err) {
      console.warn('Get user by nick or email error!\n' + err.message);

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
          data =await this._db.db.manyOrNone(`
        SELECT id, about, email, fullname, nickname
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
          data = await this._db.db.manyOrNone(`
        SELECT id, about, email, fullname, nickname
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
        data = await this._db.db.manyOrNone(`
          SELECT id, about, email, fullname, nickname
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
      console.log(`'Get users of forum error : \n\n${err.message}\n\n`);
      return {
        success: false,
        err,
      };
    }
  }
};
