const db = require('../modules/db-config').db;
// const PQ = require('pg-promise').ParameterizedQuery;

module.exports = new class PostModel {
  constructor() {
    this.db = db;
  }

  createOrUpdateVote(nickname, threadSlug, threadId, voice) {
    return this.db.task(async (t) => {
      const user = await t.oneOrNone(`
        Select nickname from users
        where nickname = $1;
        `, [
        nickname,
      ]);

      if (!user) {
        return {
          status: 404,
          data: {
            message: `Can't find user with id ${nickname}`,
          },
        };
      }

      let thread;
      if (threadSlug) {
        thread = await t.oneOrNone(`
        Select id from threads
        where slug = $1;
        `, [
          threadSlug,
        ]);
      } else {
        thread = await t.oneOrNone(`
        Select id from threads
        where id = $1;
        `, [
          threadId,
        ]);
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

      await t.oneOrNone(`
        INSERT INTO votes
        (thread, nickname, voice)
        VALUES ($1, $2, $3) 
        ON CONFLICT (thread, nickname) DO 
        UPDATE SET voice = $3;
        `, [
        thread.id,
        user.nickname,
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
    })
        .catch((err) => {
          console.log(err);
          // if (err.table === 'votes') {
          //   return {
          //     status: 404,
          //     data: {
          //       message: `Can't find user`,
          //     },
          //   };
          // }
          return {
            status: 500,
            err,
          };
        });
  }
};
