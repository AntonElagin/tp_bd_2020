const db = require('../modules/db-config');
// const PQ = require('pg-promise').ParameterizedQuery;

module.exports = new class PostModel {
  constructor() {
    this._db = db;
  }

  async createOrUpdateVote(userId, threadSlug, threadId, voice) {
    try {
      const data = await this._db.db.task(async (t) => {
        const user = await t.oneOrNone(`
        Select * from users
        where nickname = $1;
        `, [
          userId,
        ]);

        if (!user) {
          return {
            status: 404,
            data: {
              message: `Can't find user with id ${userId}`,
            },
          };
        }

        const thread = await t.oneOrNone(`
        Select * from threads
        where slug = $1 or id = $2;
        `, [
          threadSlug,
          threadId,
        ]);

        if (!thread) {
          return {
            status: 404,
            data: {
              message:
              `Can't find thread with slug or id ${threadSlug || threadId}`,
            },
          };
        }

        await t.none(`
        INSERT INTO votes as v
        (nickname, thread, voice)
        VALUES ($1, $2, $3) 
        ON CONFLICT ON CONSTRAINT unique_vote DO
        UPDATE SET voice = $3;
        `, [
          user.nickname,
          thread.id,
          voice,
        ]);

        const threadUP = await t.one(`
        select * from threads where id = $1;
        `, [
          thread.id,
        ]);

        return {
          status: 200,
          data: threadUP,
        };
      });


      return data;
    } catch (err) {
      console.error(`
      [Posts] vote error:
      ${err.message}
      `);
      return {
        status: 500,
        err,
      };
    }
  }
};
