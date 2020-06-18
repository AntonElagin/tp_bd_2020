const db = require('../modules/db-config');
// const PQ = require('pg-promise').ParameterizedQuery;

module.exports = new class PostModel {
  constructor() {
    this._db = db;
  }

  async createOrUpdateVote(userId, threadSlug, threadId, voice) {
    try {
      const [user, thread, oldVoice] = await this._db.db.task(async (t) => {
        const user = await t.oneOrNone(`
        Select * from users
        where nickname = $1;
        `, [
          userId,
        ]);


        let thread;

        if (threadSlug) {
          thread = await t.oneOrNone(`
        Select * from threads
        where slug = $1
        `, [
            threadSlug,
          ]);
        } else {
          thread = await t.oneOrNone(`
        Select * from threads
        where id = $1;
        `, [
            threadId,
          ]);
        }

        if (thread && user) {
          const oldVoice = await t.oneOrNone(`
          select voice from votes
          where thread = $1 and nickname = $2
        `, [
            thread.id,
            user.nickname,
          ]);

          return t.batch([user, thread, oldVoice]);
        }
        return t.batch([user, thread]);
      },
      );

      if (!user) {
        return {
          status: 404,
          data: {
            message: `Can't find user with id ${userId}`,
          },
        };
      }

      if (!thread) {
        return {
          status: 404,
          data: {
            message:
            `Can't find thread with slug or id ${threadSlug || threadId}`,
          },
        };
      }

      return await this._db.db.task(async (t) => {
        let count = +voice;
        if (!oldVoice || !oldVoice.voice) {
          await t.none(`
          INSERT INTO votes
          (nickname, thread, voice)
          VALUES ($1, $2, $3);
          `, [
            user.nickname,
            thread.id,
            voice,
          ]);
        } else {
          count = count - +oldVoice.voice;
          await t.none(`
          Update votes
          set voice = $1
          where thread = $2 and nickname = $3
          `, [
            voice,
            thread.id,
            user.nickname,
          ]);
        }

        console.log('success\n\n\n\n\n');
        const threadUP = await t.one(`
         UPDATE threads 
         SET votes = votes + $1
         where id = $2
         returning *
        `, [
          count,
          thread.id,
        ]);
        console.log(`befor: ${thread.votes}, after: ${threadUP.votes} [${(oldVoice)? oldVoice.voice: oldVoice} -> ${voice}]  count: ${count}`);
        return {
          status: 200,
          data: threadUP,
        };
      });
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
