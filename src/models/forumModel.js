const db = require('../modules/db-config').db;
const Threads = require('./threadModel');
const Users = require('./userModel');

module.exports = new class ForumModel {
  constructor() {
    this.db = db;
  }

  async createThreadTx(slug, threadData) {
    return await this.db.task(async (t) => {
      const user = await Users.getUserByNickname(threadData.author, t);

      if (!user) {
        return {
          status: 404,
          data: {
            message: `Cant' find user with nickname '${threadData.author}'\n`,
          },
        };
      }

      const forum = await this.getForumDetails(slug, t);

      if (!forum) {
        return {
          status: 404,
          data: {
            message: `Cant' find forum with slug '${slug}'\n`,
          },
        };
      }

      const thread = await Threads.getThreadBySlug(threadData.slug, t);

      if (thread) {
        return {
          status: 409,
          data: thread,
        };
      }

      const createdThread = await Threads.createThread(
          threadData,
          forum,
          user,
          t,
      );

      await t.none(`
                UPDATE forums SET 
                  threads = threads + 1
                  WHERE slug = $1;
            `, [forum.slug]);

      await t.none(`
                INSERT INTO forum_users (forum_slug, user_nickname,
                   fullname, about, email)
                  VALUES ($1, $2, $3, $4, $5)
                  ON CONFLICT DO NOTHING;
            `, [
        slug,
        user.nickname,
        user.fullname,
        user.about,
        user.email,
      ]);

      return {
        status: 201,
        data: createdThread,
      };
    });
  }

  async getUsersOfForumTx(slug, getParams) {
    return await this.db.task(async (t) => {
      getParams.db = t;

      const users = await Users.getUsersByForum({slug}, getParams);

      if (users.length === 0) {
        const forum = await this.getForumDetails(slug, t);

        if (!forum) {
          return {
            status: 404,
            data: {
              message: `Can't find forum with slug '${slug}'\n`,
            },
          };
        }
      }
      return {
        status: 200,
        data: users || [],
      };
    });
  }

  async getForumThreadsTx(slug, getParams) {
    return await this.db.task(async (t) => {
      getParams.db = t;

      const forumThreads = await Threads.getForumThreads({slug}, getParams);

      if (forumThreads.length ===0) {
        const forum = await this.getForumDetails(slug, t);

        if (!forum) {
          return {
            status: 404,
            data: {
              message: `Can't find forum with slug '${slug}\n`,
            },
          };
        }
      }
      return {
        status: 200,
        data: forumThreads || [],
      };
    });
  }

  async createForumTx(forum) {
    return await this.db.task(async (t) => {
      const user = await Users.getUserByNickname(forum.user, t);

      if (!user) {
        return {
          status: 404,
          data: {
            message: `Can't find user with nickname '${forum.user}'\n`,
          },
        };
      }

      const forumExist = await this.getForumDetails(forum.slug, t);

      if (forumExist) {
        return {
          status: 409,
          data: forumExist,
        };
      }

      const forumCreated = await this.createForum(forum, user, t);

      return {
        status: 201,
        data: forumCreated,
      };
    });
  }

  async createForum(forumData = {}, userData = {}, db = this.db) {
    return await db.one(`INSERT INTO
      forums (slug, title, author)
       VALUES ($1, $2, $3)
       RETURNING *`, [
      forumData.slug,
      forumData.title,
      userData.nickname,
    ]);
  }

  async getForumDetails(forumSlug = '', db = this.db) {
    return await db.oneOrNone(`Select * 
      from forums
      where slug = $1`, [
      forumSlug,
    ]);
  }
};
