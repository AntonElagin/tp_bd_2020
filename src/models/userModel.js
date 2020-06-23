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

      // const dataConflict = await this.getUserByNicknameOrEmail(
      //     userData.nickname,
      //     userData.email,
      //     t,
      // );

      // if (dataConflict.length > 0) {
      //   return {
      //     status: 409,
      //     data: dataConflict,
      //   };
      // }

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

  async createUser(nickname, about, email, fullname, db = this.db) {
    return await db.one(`
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

  async getUserByNickname(nickname = '', db = this.db) {
    return await db.oneOrNone(`
      Select * from users
      where nickname = $1
    `, [
      nickname,
    ]);
  }

  async getUserByNicknameOnlyNickname(nickname = '', db = this.db) {
    return await db.oneOrNone(`
      Select nickname from users
      where nickname = $1
    `, [
      nickname,
    ]);
  }

  async updateUserProfile(nickname = '', userData = {}, db = this.db) {
    const condition = pgp.as.format(
        ' WHERE nickname = $1 Returning *',
        [
          nickname,
        ],
    );
    const updateUserQuery = pgp.helpers
        .update(userData, null, 'users') + condition;
    return await db.one(updateUserQuery);
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

  async getUsersByForum(forum = {},
      {
        limit = 1000,
        since = '',
        desc = false,
        db = this.db,
      } = {}) {
    let data;
    if (since) {
      if (desc) {
        data =await db.manyOrNone(`
        SELECT about, email, fullname, nickname
        from forum_users 
        join users  ON nickname = user_nickname AND user_nickname < $2
        where forum_slug = $1 
        order by user_nickname DESC
        limit $3
      `, [
          forum.slug,
          since,
          +limit,
        ]);
      } else {
        data = await db.manyOrNone(`
        SELECT about, email, fullname, nickname
        from forum_users 
        join users ON nickname = user_nickname and user_nickname > $2
        where forum_slug = $1 
        order by user_nickname ASC
        limit $3
      `, [
          forum.slug,
          since,
          +limit,
        ]);
      }
    } else {
      data = await db.manyOrNone(`
          SELECT about, email, fullname, nickname
          from forum_users
          join users ON nickname = user_nickname
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
