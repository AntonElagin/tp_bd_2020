const {db, pgp} = require('../modules/db-config');

module.exports = new class UserModel {
  constructor() {
    this.db = db;
  }

  updateUserTx(nickname = '', userData ={}) {
    return this.db.tx(async (t) => {
      const userExist = await this.getUserByNickname(nickname, t);

      if (!userExist) {
        return {
          status: 404,
          data: {
            message: `Can't find user with nickname '${nickname}'\n`,
          },
        };
      }

      if (Object.keys(userData).length === 0) {
        return {
          status: 200,
          data: userExist,
        };
      }

      const updatedUser = await this.updateUserProfile(
          nickname,
          userData,
          t,
      );

      return {
        status: 200,
        data: updatedUser,
      };
    })
        .catch((err) => {
          console.log(err);
          if (err.constraint === 'users_email_key') {
            return {
              status: 409,
              data: {
                message: `Conflict email`,
              },
            };
          }
          if (err.constraint === 'users_nickname_key') {
            return {
              status: 409,
              data: {
                message: `Conflict nickname`,
              },
            };
          }
          return {
            status: 500,
            data: err,
          };
        });
  }

  createUserTx(userData) {
    return this.db.tx(async (t) => {
      const dataExist = await this.getUserByNicknameOrEmail(
          userData.nickname,
          userData.email,
          t,
      );

      if (dataExist.length > 0) {
        return {
          status: 409,
          user: dataExist,
        };
      }

      const newUser = await this.createUser(
          userData.nickname,
          userData.email,
          userData.about,
          userData.fullname,
          t,
      );

      return {
        status: 201,
        user: newUser,
      };
    });
  }

  createUser(nickname, about, email, fullname, db = this.db) {
    return db.one(`
    INSERT INTO users
    (nickname, email, about, fullname)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
    `, [
      nickname,
      about,
      email,
      fullname,
    ]);
  }

  getUserByNickname(nickname = '', db = this.db) {
    return db.oneOrNone(`
      Select * from users
      where nickname = $1
    `, [
      nickname,
    ]);
  }

  updateUserProfile(nickname = '', userData = {}, db = this.db) {
    const condition = pgp.as.format(
        ' WHERE nickname = $1 Returning *',
        [
          nickname,
        ],
    );
    const updateUserQuery = pgp.helpers
        .update(userData, null, 'users') + condition;
    return db.one(updateUserQuery);
  }

  getUserByNicknameOrEmail(nickname = '', email = '', db = this.db) {
    return db.manyOrNone(`
    SELECT * 
    FROM users
    WHERE nickname = $1 OR email = $2;
    `, [
      nickname,
      email,
    ]);
  }

  getUsersByForum(forum = {},
      {
        limit = 1000,
        since = '',
        desc = false,
        db = this.db,
      } = {}) {
    let data;
    if (since) {
      if (desc) {
        data = db.manyOrNone(`
        SELECT about, email, fullname, user_nickname as nickname
        from forum_users 
        where forum_slug = $1 AND user_nickname < $2
        order by user_nickname DESC
        limit $3
      `, [
          forum.slug,
          since,
          +limit,
        ]);
      } else {
        data = db.manyOrNone(`
        SELECT about, email, fullname, user_nickname as nickname
        from forum_users
        where forum_slug = $1 and user_nickname > $2
        order by user_nickname ASC
        limit $3
      `, [
          forum.slug,
          since,
          +limit,
        ]);
      }
    } else {
      data = db.manyOrNone(`
          SELECT about, email, fullname, user_nickname as nickname
          from forum_users
          where forum_slug = $1
          order by user_nickname $2:raw
          limit $3
        `, [
        forum.slug,
           (desc) ? 'desc': 'asc',
           +limit]);
    }

    return data;
  }
};
